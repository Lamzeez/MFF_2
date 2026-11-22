import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MENU_ITEM_CATEGORIES,
  archiveStoreMenuItem,
  createStoreMenuItem,
  fetchStoreById,
  fetchStoreMenuItems,
  fetchUserStoreId,
  subscribeToStoreMenuItems,
  updateMenuItemAvailability,
  updateStoreMenuItem,
} from "../../../services/catalog";
import { uploadMenuItemPhoto } from "../../../services/storage";
import { useSession } from "../../../context/SessionContext";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";
import {
  ImageUploadDropzone,
  type SelectedMerchantImageAsset,
} from "../../../components/merchant/ImageUploadDropzone";
import {
  MAX_MENU_ITEM_IMAGE_BYTES,
  type MenuItemFieldErrors,
  filterMenuItemDescriptionInput,
  filterMenuItemNameInput,
  filterMenuItemPriceInput,
  filterMenuSearchInput,
  parseAndValidateMenuItemPrice,
  validateMenuItemForm,
} from "../../../lib/merchant-validation";
import type {
  FoodItem,
  StoreSubscriptionTier,
  DishModifierGroup,
  DishModifierOption,
} from "../../../types/restaurant";

const ITEM_CATEGORY_OPTIONS = [...MENU_ITEM_CATEGORIES];

export default function MenuManager() {
  const { identity } = useSession("merchant");
  const [storeId, setStoreId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<StoreSubscriptionTier>("basic");
  const [isTemporarilyOffline, setIsTemporarilyOffline] = useState(false);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  // Add / Edit Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCategory, setItemCategory] = useState<string>(ITEM_CATEGORY_OPTIONS[0]);
  const [itemModifiers, setItemModifiers] = useState<DishModifierGroup[]>([]);
  const [itemPrice, setItemPrice] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [itemImageAsset, setItemImageAsset] = useState<SelectedMerchantImageAsset | null>(null);
  const [fieldErrors, setFieldErrors] = useState<MenuItemFieldErrors>({});
  const [savingItem, setSavingItem] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // View & Delete Modals
  const [viewingItem, setViewingItem] = useState<FoodItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<FoodItem | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  const [banner, setBanner] = useState<BannerMessage | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (
      activeObjectUrlRef.current &&
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, [revokeObjectUrl]);

  useEffect(() => {
    let active = true;
    if (!identity?.id) {
      setLoading(false);
      return;
    }

    fetchUserStoreId(identity.id)
      .then((id) => {
        if (!active) return;
        if (id) {
          setStoreId(id);
        } else {
          setMenuItems([]);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [identity?.id]);

  const loadMenu = useCallback(async (targetStoreId: string) => {
    setLoading(true);
    try {
      const [items, storeProfile] = await Promise.all([
        fetchStoreMenuItems(targetStoreId, "merchant"),
        fetchStoreById(targetStoreId),
      ]);
      setMenuItems(items);
      if (storeProfile) {
        if (storeProfile.subscription_tier) {
          setSubscriptionTier((storeProfile.subscription_tier || "basic") as StoreSubscriptionTier);
        }
        setIsTemporarilyOffline(Boolean(storeProfile.isTemporarilyOffline));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!storeId) return;
    void loadMenu(storeId);
    const unsub = subscribeToStoreMenuItems(storeId, () => {
      void loadMenu(storeId);
    });
    return () => {
      unsub();
    };
  }, [storeId, loadMenu]);

  const availableCategories = useMemo(() => {
    return [...MENU_ITEM_CATEGORIES];
  }, []);

  const MODIFIER_PRESETS = [
    {
      label: "+ Spice Level",
      name: "Spice Level",
      required: true,
      options: [
        { id: "mild", name: "Mild", priceAdjustment: 0 },
        { id: "medium", name: "Medium", priceAdjustment: 0 },
        { id: "extra_spicy", name: "Extra Spicy 🔥", priceAdjustment: 15 },
      ],
    },
    {
      label: "+ Extra Rice",
      name: "Rice Add-on",
      required: false,
      options: [
        { id: "plain_rice", name: "Extra Plain Rice", priceAdjustment: 15 },
        { id: "garlic_rice", name: "Extra Garlic Rice", priceAdjustment: 20 },
      ],
    },
    {
      label: "+ Portion Size",
      name: "Portion Size",
      required: true,
      options: [
        { id: "solo", name: "Solo / Regular", priceAdjustment: 0 },
        { id: "sharing", name: "Large / Sharing", priceAdjustment: 50 },
      ],
    },
    {
      label: "+ Egg Add-on",
      name: "Egg Choice",
      required: false,
      options: [
        { id: "sunny_egg", name: "Sunny-Side Up Egg", priceAdjustment: 15 },
        { id: "boiled_egg", name: "Hard-Boiled Egg", priceAdjustment: 15 },
      ],
    },
  ];

  const handleAddModifierGroup = (
    presetName = "Customization Group",
    presetOptions: DishModifierOption[] = [],
    required = false
  ) => {
    const newGroup: DishModifierGroup = {
      id: "mod_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      name: presetName,
      required,
      options:
        presetOptions.length > 0
          ? presetOptions
          : [{ id: "opt_" + Date.now(), name: "Standard Choice", priceAdjustment: 0 }],
    };
    setItemModifiers((prev) => [...prev, newGroup]);
  };

  const handleRemoveModifierGroup = (groupId: string) => {
    setItemModifiers((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleUpdateModifierGroupName = (groupId: string, name: string) => {
    setItemModifiers((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name } : g))
    );
  };

  const handleToggleModifierGroupRequired = (groupId: string) => {
    setItemModifiers((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, required: !g.required } : g))
    );
  };

  const handleAddModifierOption = (groupId: string) => {
    setItemModifiers((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const newOpt: DishModifierOption = {
          id: "opt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          name: "Add-on Choice",
          priceAdjustment: 0,
        };
        return { ...g, options: [...g.options, newOpt] };
      })
    );
  };

  const handleUpdateModifierOption = (
    groupId: string,
    optionId: string,
    name: string,
    priceAdjustment: number
  ) => {
    setItemModifiers((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.map((opt) =>
            opt.id === optionId ? { ...opt, name, priceAdjustment } : opt
          ),
        };
      })
    );
  };

  const handleRemoveModifierOption = (groupId: string, optionId: string) => {
    setItemModifiers((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.filter((opt) => opt.id !== optionId),
        };
      })
    );
  };

  const resetItemModal = useCallback(() => {
    revokeObjectUrl();
    setEditingItem(null);
    setItemName("");
    setItemDescription("");
    setItemCategory(ITEM_CATEGORY_OPTIONS[0]);
    setItemModifiers([]);
    setItemPrice("");
    setExistingImageUrl(null);
    setItemImageAsset(null);
    setFieldErrors({});
    setModalError(null);
  }, [revokeObjectUrl]);

  const openAddModal = () => {
    if (isTemporarilyOffline) {
      setBanner({
        type: "error",
        message:
          "Your storefront is temporarily offline because your subscription has ended. Choose a plan on the Billing & Plans page to reactivate your store.",
      });
      return;
    }
    if (subscriptionTier === "basic" && menuItems.length >= 15) {
      setBanner({
        type: "error",
        message:
          "Menu Item Limit Reached (15/15 items on Basic Plan). Upgrade to Standard (₱299/mo) on the Billing & Plans page to list up to 60 items.",
      });
      return;
    }
    if (subscriptionTier === "standard" && menuItems.length >= 60) {
      setBanner({
        type: "error",
        message:
          "Menu Item Limit Reached (60/60 items on Standard Plan). Upgrade to Commercial (₱699/mo) on the Billing & Plans page for unlimited items.",
      });
      return;
    }
    resetItemModal();
    setShowItemModal(true);
  };

  const openEditModal = (item: FoodItem) => {
    revokeObjectUrl();
    setEditingItem(item);
    setItemName(filterMenuItemNameInput(item.name));
    setItemDescription(filterMenuItemDescriptionInput(item.description || ""));
    setItemCategory(
      (ITEM_CATEGORY_OPTIONS as string[]).includes(item.category)
        ? item.category
        : ITEM_CATEGORY_OPTIONS[0]
    );
    setItemModifiers(
      Array.isArray(item.modifiers)
        ? JSON.parse(JSON.stringify(item.modifiers))
        : []
    );
    setItemPrice(String(item.price));
    setExistingImageUrl(item.imageUrl || null);
    setItemImageAsset(null);
    setFieldErrors({});
    setModalError(null);
    setShowItemModal(true);
  };

  const handleCloseModal = () => {
    if (savingItem) return;
    setShowItemModal(false);
    resetItemModal();
  };

  const handleSelectItemImage = useCallback(
    (asset: SelectedMerchantImageAsset) => {
      revokeObjectUrl();
      if (asset.isObjectUrl && asset.previewUri) {
        activeObjectUrlRef.current = asset.previewUri;
      }
      setItemImageAsset(asset);
      setFieldErrors((prev) => ({ ...prev, image: undefined }));
      setModalError(null);
    },
    [revokeObjectUrl]
  );

  const handleRemoveItemImage = useCallback(() => {
    revokeObjectUrl();
    setItemImageAsset(null);
    setExistingImageUrl(null);
    setFieldErrors((prev) => ({ ...prev, image: undefined }));
  }, [revokeObjectUrl]);

  const toggleAvailability = async (id: number) => {
    const target = menuItems.find((m) => m.id === id);
    if (!target) return;

    if (subscriptionTier === "basic") {
      setBanner({
        type: "error",
        message:
          "Item-level sold-out toggle is available on Standard (₱299/mo) and Commercial plans. On Basic, availability follows your store's live Open/Closed switch. Go to Billing & Plans to upgrade.",
      });
      return;
    }

    const newStatus = !target.available;

    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, available: newStatus } : item))
    );

    if (target.menuItemId) {
      const res = await updateMenuItemAvailability(target.menuItemId, newStatus);
      if (!res.success) {
        console.warn("Failed to persist availability:", res.error);
        setMenuItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, available: !newStatus } : item))
        );
        setBanner({
          type: "error",
          message: `Failed to update "${target.name}" availability.`,
        });
      }
    }
  };

  const handleSaveItem = async () => {
    setModalError(null);
    if (!storeId) {
      setModalError("Store profile not loaded yet. Please wait and try again.");
      return;
    }

    const finalCategory = itemCategory;

    const errors = validateMenuItemForm({
      name: itemName,
      description: itemDescription,
      category: finalCategory,
      price: itemPrice,
      allowedCategories: ITEM_CATEGORY_OPTIONS as string[],
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setModalError("Please review the highlighted item fields below.");
      return;
    }

    const priceResult = parseAndValidateMenuItemPrice(itemPrice);
    if (priceResult.value === null) {
      setFieldErrors({ ...errors, price: priceResult.error || "Invalid item price." });
      setModalError(priceResult.error || "Invalid item price.");
      return;
    }

    setSavingItem(true);
    try {
      let resolvedImageUrl: string | null | undefined = existingImageUrl;
      if (itemImageAsset) {
        const uploadRes = await uploadMenuItemPhoto(itemImageAsset.blobOrUri, storeId, {
          mimeType: itemImageAsset.mimeType,
        });
        if (!uploadRes.publicUrl) {
          const uploadErr = uploadRes.error || "Could not upload item overview image.";
          setFieldErrors((prev) => ({ ...prev, image: uploadErr }));
          setModalError(uploadErr);
          setSavingItem(false);
          return;
        }
        resolvedImageUrl = uploadRes.publicUrl;
      }

      const cleanName = filterMenuItemNameInput(itemName).trim();
      const cleanDescription = filterMenuItemDescriptionInput(itemDescription).trim();

      if (editingItem?.menuItemId) {
        const res = await updateStoreMenuItem(editingItem.menuItemId, {
          name: cleanName,
          price: priceResult.value,
          category: finalCategory,
          description: cleanDescription || `${finalCategory} special in Mati City`,
          imageUrl: resolvedImageUrl ?? null,
          modifiers: itemModifiers,
        });

        if (res.success && res.data) {
          setMenuItems((prev) =>
            prev.map((m) => (m.id === editingItem.id ? res.data! : m))
          );
          setShowItemModal(false);
          resetItemModal();
          setBanner({
            type: "success",
            message: `Updated "${res.data.name}" successfully.`,
          });
        } else {
          setModalError("Failed to update item: " + (res.error || "Unknown error"));
        }
      } else {
        const res = await createStoreMenuItem(storeId, {
          name: cleanName,
          price: priceResult.value,
          category: finalCategory,
          description: cleanDescription || `${finalCategory} special in Mati City`,
          imageUrl: resolvedImageUrl || undefined,
          isAvailable: true,
          modifiers: itemModifiers,
        });

        if (res.success && res.data) {
          setMenuItems((prev) => [res.data!, ...prev]);
          setShowItemModal(false);
          resetItemModal();
          setBanner({
            type: "success",
            message: `Item "${res.data.name}" added to your menu.`,
          });
        } else {
          setModalError("Failed to add item: " + (res.error || "Unknown error"));
        }
      }
    } catch (err: any) {
      setModalError("Error saving item: " + (err?.message || "Unknown error"));
    } finally {
      setSavingItem(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem?.menuItemId) return;
    setDeletingInProgress(true);
    try {
      const res = await archiveStoreMenuItem(deletingItem.menuItemId);
      if (res.success) {
        const removedName = deletingItem.name;
        setMenuItems((prev) => prev.filter((m) => m.id !== deletingItem.id));
        if (viewingItem?.id === deletingItem.id) setViewingItem(null);
        setDeletingItem(null);
        setBanner({
          type: "success",
          message: `Removed "${removedName}" from your live menu.`,
        });
      } else {
        setBanner({
          type: "error",
          message: `Could not delete item: ${res.error || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      setBanner({
        type: "error",
        message: err?.message || "Could not delete menu item.",
      });
    } finally {
      setDeletingInProgress(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (selectedCategoryFilter !== "All" && item.category !== selectedCategoryFilter) {
      return false;
    }

    if (selectedFilter === "Available") return item.available;
    if (selectedFilter === "Sold Out") return !item.available;
    return true;
  });

  const activeModalPreviewUrl = itemImageAsset?.previewUri || existingImageUrl;

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-6xl self-center">
      {/* Page Header */}
      <View className="mb-5 flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <View>
          <Text className="text-[10px] font-bold text-[#EA5410] uppercase tracking-wider mb-0.5">
            Catalog Management
          </Text>
          <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
            Store Menu Manager
          </Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            Configure item prices, descriptions, photos, and availability toggles for your store.
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View
            className={`px-2.5 py-1 rounded-lg border ${
              subscriptionTier === "basic"
                ? "bg-slate-50 border-slate-200"
                : subscriptionTier === "standard"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-amber-50 border-amber-200"
            }`}
          >
            <Text
              className={`text-[11px] font-bold ${
                subscriptionTier === "basic"
                  ? "text-slate-700"
                  : subscriptionTier === "standard"
                    ? "text-blue-700"
                    : "text-amber-800"
              }`}
            >
              {menuItems.length}/{subscriptionTier === "basic" ? "15" : subscriptionTier === "standard" ? "60" : "∞"} Items ({subscriptionTier === "basic" ? "Basic" : subscriptionTier === "standard" ? "Standard" : "Commercial"})
            </Text>
          </View>

          <Pressable
            disabled={!storeId}
            onPress={openAddModal}
            className="h-8 bg-[#EA5410] px-3.5 rounded-lg hover:bg-[#D04508] transition-colors shadow-2xs flex-row items-center gap-1.5 cursor-pointer"
          >
            <Ionicons name="add" size={14} color="white" />
            <Text className="text-white font-bold text-[11px]">Add New Item</Text>
          </Pressable>
        </View>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Search (Left) & Filters (Right) */}
      <View className="flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4">
        <View className="flex-row items-center gap-3 w-full lg:w-auto">
          <View className="flex-1 lg:flex-none lg:w-80 h-9 bg-white border border-gray-200/90 rounded-xl px-3 shadow-2xs flex-row items-center gap-2">
            <Ionicons name="search" size={14} color="#9CA3AF" />
            <TextInput
              placeholder="Search item name, category, or description..."
              value={search}
              onChangeText={(text) => setSearch(filterMenuSearchInput(text))}
              maxLength={100}
              className="flex-1 text-xs text-gray-900 outline-none"
              placeholderTextColor="#9ca3af"
            />
            {search ? (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={14} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>
          {!loading && (
            <Text className="text-[11px] font-medium text-gray-400 hidden sm:flex tabular-nums">
              Showing {filteredItems.length} of {menuItems.length}
            </Text>
          )}
        </View>

        <View className="flex-row flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl min-h-[36px] self-start lg:self-auto">
          {["All", "Available", "Sold Out"].map((f) => (
            <Pressable
              key={f}
              onPress={() => setSelectedFilter(f)}
              className={`h-7 px-3 rounded-lg items-center justify-center transition-colors cursor-pointer ${
                selectedFilter === f ? "bg-white shadow-2xs" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-[11px] font-semibold ${
                  selectedFilter === f ? "text-[#EA5410]" : "text-gray-500"
                }`}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Dynamic Category Filter Pills */}
        <View className="flex-row flex-wrap items-center gap-1.5 w-full pt-1">
          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
            Category:
          </Text>
          {["All", ...availableCategories].map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategoryFilter(cat)}
              className={`h-6 px-2.5 rounded-lg border items-center justify-center cursor-pointer ${
                selectedCategoryFilter === cat
                  ? "bg-orange-50 border-[#EA5410]"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Text
                className={`text-[10px] font-semibold ${
                  selectedCategoryFilter === cat ? "text-[#EA5410]" : "text-gray-600"
                }`}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Menu Table Card */}
      <View className="bg-white rounded-2xl shadow-2xs border border-gray-200/80 overflow-hidden mb-6">
        {/* Table Header */}
        <View className="hidden lg:flex flex-row bg-gray-50/90 px-5 py-3 border-b border-gray-200 gap-4">
          <Text className="flex-1 min-w-[200px] font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Item
          </Text>
          <Text className="w-[100px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Price (PHP)
          </Text>
          <Text className="w-[155px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider">
            Sold Out Toggle
          </Text>
          <Text className="w-[100px] shrink-0 font-bold text-[11px] text-gray-400 uppercase tracking-wider text-right">
            Actions
          </Text>
        </View>

        {loading ? (
          <View className="py-14 items-center justify-center">
            <ActivityIndicator size="small" color="#EA5410" />
            <Text className="text-gray-400 mt-2 text-[11px] font-medium">
              Loading store menu...
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View className="py-12 items-center justify-center px-4">
            <Ionicons name="restaurant-outline" size={28} color="#CBD5E1" />
            <Text className="text-gray-700 font-bold text-xs mt-2.5">
              {menuItems.length === 0 ? "No menu items added yet" : "No menu items match your filter"}
            </Text>
            <Text className="text-gray-400 text-[11px] mt-0.5 text-center">
              {menuItems.length === 0
                ? 'Click "Add New Item" to publish your first food or beverage listing.'
                : "Try adjusting your search or availability filter."}
            </Text>
          </View>
        ) : (
          <View>
            {filteredItems.map((item, idx) => {
              const isLast = idx === filteredItems.length - 1;
              return (
                <View
                  key={item.id}
                  className={`flex-col lg:flex-row px-5 py-3.5 items-start lg:items-center gap-3 lg:gap-4 hover:bg-orange-50/30 transition-colors ${
                    isLast ? "" : "border-b border-gray-100"
                  }`}
                >
                  {/* Clickable Item Container (opens View modal) */}
                  <Pressable
                    onPress={() => setViewingItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${item.name}`}
                    className="w-full lg:w-auto lg:flex-1 min-w-0 flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 cursor-pointer"
                  >
                    {/* Item Info */}
                    <View className="w-full lg:w-auto lg:flex-1 lg:min-w-[200px] min-w-0 flex-row items-center gap-3">
                      <Image
                        source={
                          item.imageUrl
                            ? { uri: item.imageUrl }
                            : require("../../../assets/food/welcome-feast.jpg")
                        }
                        className="w-10 h-10 rounded-xl bg-gray-100 shrink-0 border border-gray-200/70"
                        resizeMode="cover"
                      />
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-bold text-gray-900 text-xs sm:text-sm" numberOfLines={1}>
                            {item.name}
                          </Text>
                          {item.category ? (
                            <View className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200/80">
                              <Text className="text-[9px] font-semibold text-gray-600">
                                {item.category}
                              </Text>
                            </View>
                          ) : null}
                          {item.modifiers && item.modifiers.length > 0 ? (
                            <View className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/80 flex-row items-center gap-0.5">
                              <Ionicons name="sparkles" size={9} color="#D97706" />
                              <Text className="text-[9px] font-bold text-amber-700">
                                {item.modifiers.length} Customization{item.modifiers.length === 1 ? "" : "s"}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {item.description ? (
                          <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Price */}
                    <View className="lg:w-[100px] lg:shrink-0">
                      <Text className="font-bold text-[#EA5410] text-xs sm:text-sm tabular-nums">
                        ₱{item.price.toFixed(2)}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Explicit Switch Toggle for Available / Sold Out */}
                  <View className="lg:w-[155px] lg:shrink-0">
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityLabel={`Toggle ${item.name} availability`}
                      accessibilityState={{ checked: item.available }}
                      onPress={() => toggleAvailability(item.id)}
                      className={`self-start h-8 pl-2 pr-3 rounded-lg border flex-row items-center gap-2 transition-colors cursor-pointer ${
                        item.available
                          ? "bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/80"
                          : "bg-gray-100 border-gray-300 hover:bg-gray-200/80"
                      }`}
                    >
                      <View
                        className={`w-8 h-4 rounded-full p-0.5 flex-row items-center ${
                          item.available ? "bg-emerald-500 justify-end" : "bg-gray-400 justify-start"
                        }`}
                      >
                        <View className="w-3 h-3 rounded-full bg-white shadow-2xs" />
                      </View>
                      <Text
                        className={`font-bold text-[10px] uppercase ${
                          item.available ? "text-emerald-800" : "text-gray-600"
                        }`}
                      >
                        {item.available ? "Available" : "Sold Out"}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Edit / Delete Actions */}
                  <View className="lg:w-[100px] lg:shrink-0 flex-row items-center lg:justify-end gap-1.5">
                    <Pressable
                      onPress={() => openEditModal(item)}
                      accessibilityLabel={`Edit ${item.name}`}
                      className="h-7 px-2.5 rounded-lg bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 flex-row items-center gap-1 cursor-pointer"
                    >
                      <Ionicons name="create-outline" size={12} color="#EA5410" />
                      <Text className="text-[11px] font-semibold text-gray-700">Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setDeletingItem(item)}
                      accessibilityLabel={`Delete ${item.name}`}
                      className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 items-center justify-center cursor-pointer"
                    >
                      <Ionicons name="trash-outline" size={13} color="#e11d48" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Add / Edit Item Interactive Modal */}
      <Modal
        visible={showItemModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable
          onPress={handleCloseModal}
          className="flex-1 bg-black/55 justify-center items-center p-4 cursor-pointer"
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="max-w-md w-full max-h-[92%]"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-5 w-full shadow-2xl border border-gray-200 cursor-default"
            >
              <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 mb-4">
                <View>
                  <Text className="text-base font-bold text-gray-900">
                    {editingItem ? "Edit Menu Item" : "Add New Item"}
                  </Text>
                  <Text className="text-[11px] text-gray-400">
                    {editingItem
                      ? "Update details shown to diners across Mati City"
                      : "Publish a food or beverage item to your live menu"}
                  </Text>
                </View>
                <Pressable
                  disabled={savingItem}
                  onPress={handleCloseModal}
                  className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center cursor-pointer"
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </Pressable>
              </View>

              {modalError && (
                <View className="mb-3 bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex-row items-center gap-2">
                  <Ionicons name="alert-circle" size={15} color="#e11d48" />
                  <Text className="text-[11px] font-semibold text-rose-800 flex-1">{modalError}</Text>
                </View>
              )}

              <View className="gap-3.5">
                {/* 1. Overview Image */}
                <View>
                  <Text className="text-[11px] font-semibold text-gray-700 mb-1">
                    Overview Image
                  </Text>
                  <ImageUploadDropzone
                    title="Upload Item Photo"
                    subtitle="Shown in menu cards & customer search"
                    previewUrl={activeModalPreviewUrl}
                    variant="compact"
                    maxSizeBytes={MAX_MENU_ITEM_IMAGE_BYTES}
                    disabled={savingItem}
                    error={fieldErrors.image || null}
                    onSelectAsset={handleSelectItemImage}
                    onRemoveAsset={handleRemoveItemImage}
                    onValidationError={(msg) =>
                      setFieldErrors((prev) => ({ ...prev, image: msg }))
                    }
                  />
                </View>

                {/* 2. Item Name */}
                <View>
                  <Text className="text-[11px] font-semibold text-gray-700 mb-1">Item Name *</Text>
                  <TextInput
                    value={itemName}
                    onChangeText={(text) => {
                      setItemName(filterMenuItemNameInput(text));
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    maxLength={120}
                    placeholder="e.g. Special Pork Humba, Iced Calamansi"
                    placeholderTextColor="#9CA3AF"
                    className={`bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-900 outline-none ${
                      fieldErrors.name ? "border-rose-400 bg-rose-50/30" : "border-gray-200"
                    }`}
                  />
                  {fieldErrors.name ? (
                    <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                      {fieldErrors.name}
                    </Text>
                  ) : null}
                </View>

                {/* 3. Description (immediately after Item Name) */}
                <View>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[11px] font-semibold text-gray-700">Description</Text>
                    <Text className="text-[10px] text-gray-400 tabular-nums">
                      {itemDescription.length}/300
                    </Text>
                  </View>
                  <TextInput
                    value={itemDescription}
                    onChangeText={(text) => {
                      setItemDescription(filterMenuItemDescriptionInput(text));
                      setFieldErrors((prev) => ({ ...prev, description: undefined }));
                    }}
                    maxLength={300}
                    placeholder="Slow-braised specialty, chilled fresh juice..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={2}
                    className={`bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-900 outline-none ${
                      fieldErrors.description ? "border-rose-400 bg-rose-50/30" : "border-gray-200"
                    }`}
                  />
                  {fieldErrors.description ? (
                    <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                      {fieldErrors.description}
                    </Text>
                  ) : null}
                </View>

                {/* 4. Item Category */}
                <View>
                  <Text className="text-[11px] font-semibold text-gray-700 mb-1">Category</Text>
                  <View className="flex-row flex-wrap gap-1.5 mb-2">
                    {ITEM_CATEGORY_OPTIONS.map((cat: string) => (
                      <Pressable
                        key={cat}
                        onPress={() => {
                          setItemCategory(cat);
                          setFieldErrors((prev) => ({ ...prev, category: undefined }));
                        }}
                        className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                          itemCategory === cat
                            ? "bg-orange-50 border-[#EA5410]"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-semibold ${
                            itemCategory === cat ? "text-[#EA5410]" : "text-gray-600"
                          }`}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {fieldErrors.category ? (
                    <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                      {fieldErrors.category}
                    </Text>
                  ) : null}
                </View>

                {/* 5. Price */}
                <View>
                  <Text className="text-[11px] font-semibold text-gray-700 mb-1">
                    Price (₱ PHP) *
                  </Text>
                  <TextInput
                    value={itemPrice}
                    onChangeText={(text) => {
                      setItemPrice(filterMenuItemPriceInput(text));
                      setFieldErrors((prev) => ({ ...prev, price: undefined }));
                    }}
                    placeholder="e.g. 120.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    maxLength={9}
                    className={`bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-900 outline-none ${
                      fieldErrors.price ? "border-rose-400 bg-rose-50/30" : "border-gray-200"
                    }`}
                  />
                  {fieldErrors.price ? (
                    <Text className="text-[11px] font-semibold text-rose-600 mt-1">
                      {fieldErrors.price}
                    </Text>
                  ) : null}
                </View>

                {/* 6. Dish Customizations & Modifiers */}
                <View className="pt-2 border-t border-gray-100">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View>
                      <Text className="text-[11px] font-semibold text-gray-700">
                        Dish Customizations & Add-ons (Modifiers)
                      </Text>
                      <Text className="text-[10px] text-gray-400">
                        Optional choices or paid add-ons (e.g. Spice Level, Extra Rice, Sizes)
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleAddModifierGroup()}
                      className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 flex-row items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Ionicons name="add" size={12} color="#EA5410" />
                      <Text className="text-[10px] font-bold text-[#EA5410]">+ Add Group</Text>
                    </Pressable>
                  </View>

                  {/* Quick Presets */}
                  <View className="flex-row flex-wrap items-center gap-1.5 mb-2.5">
                    <Text className="text-[10px] text-gray-400 font-medium mr-1">Presets:</Text>
                    {MODIFIER_PRESETS.map((preset) => (
                      <Pressable
                        key={preset.label}
                        onPress={() => handleAddModifierGroup(preset.name, preset.options, preset.required)}
                        className="px-2 py-0.5 rounded-md bg-gray-50 hover:bg-orange-50/60 border border-gray-200 hover:border-orange-200 flex-row items-center gap-1 cursor-pointer"
                      >
                        <Text className="text-[10px] font-semibold text-gray-600 hover:text-[#EA5410]">
                          {preset.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Group Cards List */}
                  {itemModifiers.length === 0 ? (
                    <View className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 items-center justify-center">
                      <Text className="text-[11px] text-gray-400 text-center">
                        No customizations added yet. Click "+ Add Group" or choose a preset above.
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-2.5">
                      {itemModifiers.map((group) => (
                        <View
                          key={group.id}
                          className="bg-gray-50/80 border border-gray-200 rounded-xl p-3"
                        >
                          {/* Group Header */}
                          <View className="flex-row items-center justify-between gap-2 mb-2">
                            <TextInput
                              value={group.name}
                              onChangeText={(val) => handleUpdateModifierGroupName(group.id, val)}
                              placeholder="Group Name (e.g. Spice Level)"
                              placeholderTextColor="#9CA3AF"
                              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-800 flex-1 outline-none focus:border-[#EA5410]"
                            />
                            <Pressable
                              onPress={() => handleToggleModifierGroupRequired(group.id)}
                              className={`px-2 py-1 rounded-md border flex-row items-center gap-1 cursor-pointer ${
                                group.required
                                  ? "bg-amber-50 border-amber-300"
                                  : "bg-gray-100 border-gray-200"
                              }`}
                            >
                              <Ionicons
                                name={group.required ? "checkbox" : "square-outline"}
                                size={12}
                                color={group.required ? "#D97706" : "#6B7280"}
                              />
                              <Text
                                className={`text-[10px] font-bold ${
                                  group.required ? "text-amber-800" : "text-gray-600"
                                }`}
                              >
                                {group.required ? "Required" : "Optional"}
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleRemoveModifierGroup(group.id)}
                              className="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-100 items-center justify-center cursor-pointer"
                            >
                              <Ionicons name="trash-outline" size={13} color="#E11D48" />
                            </Pressable>
                          </View>

                          {/* Options Inside Group */}
                          <View className="gap-1.5 pl-2 border-l-2 border-orange-200 ml-1">
                            {group.options.map((opt) => (
                              <View key={opt.id} className="flex-row items-center gap-2">
                                <TextInput
                                  value={opt.name}
                                  onChangeText={(val) =>
                                    handleUpdateModifierOption(group.id, opt.id, val, opt.priceAdjustment)
                                  }
                                  placeholder="Option name (e.g. Extra Rice)"
                                  placeholderTextColor="#9CA3AF"
                                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 flex-1 outline-none focus:border-[#EA5410]"
                                />
                                <View className="flex-row items-center bg-white border border-gray-200 rounded-lg px-2 py-1 w-24">
                                  <Text className="text-[11px] font-bold text-gray-500 mr-1">+₱</Text>
                                  <TextInput
                                    value={opt.priceAdjustment === 0 ? "0" : String(opt.priceAdjustment || "")}
                                    onChangeText={(val) => {
                                      const num = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
                                      handleUpdateModifierOption(group.id, opt.id, opt.name, num);
                                    }}
                                    placeholder="0"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="decimal-pad"
                                    className="text-xs font-semibold text-gray-800 flex-1 outline-none tabular-nums"
                                  />
                                </View>
                                {group.options.length > 1 ? (
                                  <Pressable
                                    onPress={() => handleRemoveModifierOption(group.id, opt.id)}
                                    className="w-5 h-5 items-center justify-center cursor-pointer text-gray-400 hover:text-rose-600"
                                  >
                                    <Ionicons name="close" size={14} color="#9CA3AF" />
                                  </Pressable>
                                ) : null}
                              </View>
                            ))}

                            <Pressable
                              onPress={() => handleAddModifierOption(group.id)}
                              className="self-start mt-1 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 flex-row items-center gap-1 cursor-pointer"
                            >
                              <Ionicons name="add" size={11} color="#4B5563" />
                              <Text className="text-[10px] font-semibold text-gray-600">+ Add Choice</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View className="flex-row justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
                <Pressable
                  disabled={savingItem}
                  onPress={handleCloseModal}
                  className="h-8 px-3.5 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer"
                >
                  <Text className="text-xs font-semibold text-gray-700">Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={savingItem}
                  onPress={handleSaveItem}
                  className="h-8 px-4 rounded-lg bg-[#EA5410] hover:bg-[#D04508] shadow-2xs flex-row items-center gap-1.5 cursor-pointer"
                >
                  {savingItem ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={14} color="white" />
                  )}
                  <Text className="text-xs font-bold text-white">
                    {savingItem
                      ? "Saving..."
                      : editingItem
                        ? "Save Changes"
                        : "Save to Menu"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Modal>

      {/* View Item Overview Modal */}
      <Modal
        visible={viewingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingItem(null)}
      >
        <Pressable
          onPress={() => setViewingItem(null)}
          className="flex-1 bg-black/55 justify-center items-center p-4 cursor-pointer"
        >
          {viewingItem ? (
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl overflow-hidden cursor-default"
            >
              <Image
                source={
                  viewingItem.imageUrl
                    ? { uri: viewingItem.imageUrl }
                    : require("../../../assets/food/welcome-feast.jpg")
                }
                className="w-full h-44 bg-gray-100"
                resizeMode="cover"
              />
              <View className="p-5">
                <View className="flex-row items-center justify-between gap-2 mb-1">
                  <View className="px-2 py-0.5 rounded bg-orange-50 border border-orange-200">
                    <Text className="text-[10px] font-bold text-[#EA5410]">
                      {viewingItem.category || "Meals"}
                    </Text>
                  </View>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      viewingItem.available ? "bg-emerald-50" : "bg-gray-100"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase ${
                        viewingItem.available ? "text-emerald-700" : "text-gray-600"
                      }`}
                    >
                      {viewingItem.available ? "Available" : "Sold Out"}
                    </Text>
                  </View>
                </View>

                <Text className="text-base font-bold text-gray-900 mt-1">
                  {viewingItem.name}
                </Text>
                <Text className="text-base font-bold text-[#EA5410] mt-0.5 tabular-nums">
                  ₱{viewingItem.price.toFixed(2)}
                </Text>

                <Text className="text-xs text-gray-600 mt-2.5 leading-relaxed">
                  {viewingItem.description || "No description provided."}
                </Text>

                {viewingItem.modifiers && viewingItem.modifiers.length > 0 ? (
                  <View className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Text className="text-[11px] font-bold text-gray-800 mb-1.5">
                      Customizations & Add-ons
                    </Text>
                    <View className="gap-2">
                      {viewingItem.modifiers.map((group) => (
                        <View key={group.id}>
                          <View className="flex-row items-center gap-1.5">
                            <Text className="text-[10px] font-bold text-gray-700">
                              {group.name}
                            </Text>
                            {group.required ? (
                              <Text className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                Required
                              </Text>
                            ) : null}
                          </View>
                          <View className="flex-row flex-wrap gap-1 mt-1">
                            {group.options.map((opt) => (
                              <View
                                key={opt.id}
                                className="bg-white border border-gray-200 rounded px-1.5 py-0.5 flex-row items-center gap-1"
                              >
                                <Text className="text-[10px] text-gray-700">{opt.name}</Text>
                                {opt.priceAdjustment > 0 ? (
                                  <Text className="text-[10px] font-bold text-[#EA5410]">
                                    +₱{opt.priceAdjustment}
                                  </Text>
                                ) : (
                                  <Text className="text-[10px] text-gray-400">Free</Text>
                                )}
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View className="flex-row justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
                  <Pressable
                    onPress={() => setViewingItem(null)}
                    className="h-8 px-3.5 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer"
                  >
                    <Text className="text-xs font-semibold text-gray-700">Close</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const target = viewingItem;
                      setViewingItem(null);
                      openEditModal(target);
                    }}
                    className="h-8 px-3.5 rounded-lg bg-[#EA5410] hover:bg-[#D04508] flex-row items-center gap-1.5 cursor-pointer"
                  >
                    <Ionicons name="create-outline" size={13} color="white" />
                    <Text className="text-xs font-bold text-white">Edit Item</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>

      {/* Delete Item Confirmation Modal */}
      <Modal
        visible={deletingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingInProgress) setDeletingItem(null);
        }}
      >
        <Pressable
          onPress={() => {
            if (!deletingInProgress) setDeletingItem(null);
          }}
          className="flex-1 bg-black/55 justify-center items-center p-4 cursor-pointer"
        >
          {deletingItem ? (
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm border border-gray-200 shadow-2xl p-5 cursor-default"
            >
              <View className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 items-center justify-center mb-3">
                <Ionicons name="trash-outline" size={18} color="#e11d48" />
              </View>
              <Text className="text-base font-bold text-gray-900">
                Delete "{deletingItem.name}"?
              </Text>
              <Text className="text-xs text-gray-500 mt-1 leading-relaxed">
                This will remove the item from your Store Menu Manager and hide it from customers in Mati FoodFinder. Past order history remains intact.
              </Text>
              <View className="flex-row justify-end gap-2 mt-5">
                <Pressable
                  disabled={deletingInProgress}
                  onPress={() => setDeletingItem(null)}
                  className="h-8 px-3.5 rounded-lg bg-gray-100 hover:bg-gray-200 items-center justify-center cursor-pointer"
                >
                  <Text className="text-xs font-semibold text-gray-700">Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={deletingInProgress}
                  onPress={() => void handleConfirmDelete()}
                  className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 flex-row items-center gap-1.5 cursor-pointer"
                >
                  {deletingInProgress ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="trash-outline" size={13} color="white" />
                  )}
                  <Text className="text-xs font-bold text-white">
                    {deletingInProgress ? "Deleting..." : "Delete Item"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
