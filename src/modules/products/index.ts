export { ProductCard, ProductDetail, ProductsList } from './components/site/ProductViews';
export { ProductCategoryForm, ProductForm } from './components/admin/ProductForms';
export { formatSpecs, formatVariants, parseSpecs, parseVariants, type SpecRow, type VariantRow } from './domain/productLines';
export { getCachedProductBySlug, getCachedProductCategories, getCachedProductList, getCachedProductSlugs, resolveOldProductSlug, type ProductCardData, type ProductCategoryRef, type ProductDetailData, type ProductVariant } from './data/productsRepository';
export { ProductCategoryIcon } from './components/site/ProductCategoryIcon';
export { PRODUCT_CATEGORY_ICON_KEYS, type ProductCategoryIconKey } from './domain/categoryIcons';
