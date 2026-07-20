export interface RowType {
  category: string;
  color: string;
  id: string;
  price: string;
  productName: string;
  releaseDate: string;
}

// 添加 export 导出 MOCK_DATA // [!code ++]
// export const MOCK_DATA: RowType[] = Array.from({ length: 50 }, (_, i) => ({
//   // [!code ++]
//   id: `${i + 1}`,
//   category: `Category ${(i % 3) + 1}`,
//   color: `${(i % 2) + 1}`,
//   productName: `Product ${i + 1}`,
//   price: `${Math.floor(Math.random() * 1000) + 100}`,
//   releaseDate: new Date(Date.now() - Math.random() * 1e10).toISOString(),
// }));
export const MOCK_DATA: RowType[] = [
  {
    id: '51',
    category: 'Electronics',
    color: 'Black',
    productName: 'Wireless Bluetooth Headphones',
    price: '199.99',
    releaseDate: '2024-05-15T08:30:00.000Z',
  },
  {
    id: '52',
    category: 'Clothing',
    color: 'Navy Blue',
    productName: "Men's Premium Cotton T-Shirt",
    price: '45.50',
    releaseDate: '2024-04-20T14:15:00.000Z',
  },
  {
    id: '53',
    category: 'Home Appliances',
    color: 'Stainless Steel',
    productName: 'High-Speed Blender with 8 Presets',
    price: '89.99',
    releaseDate: '2024-03-10T10:00:00.000Z',
  },
];
export const getExampleTableApi = async (params: any) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const { page = 1, pageSize = 10, ...filters } = params;
  const data = MOCK_DATA.filter((item) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      return String(item[key as keyof RowType]).includes(String(value));
    });
  });

  return {
    total: data.length,
    list: data.slice((page - 1) * pageSize, page * pageSize),
  };
};
