export const calculateItemTotal = (item) => {
  const price = Number(item.price) || 0;
  const qty = Number(item.quantity || item.qty) || 0;
  const discount = Number(item.discount) || 0;
  return (price * qty) - discount;
};

export const calculateTotals = (items) => {
  let subtotal = 0;
  let total_discount = 0;
  let total_cgst = 0;
  let total_sgst = 0;

  items.forEach(item => {
    const itemSub = calculateItemTotal(item);
    const itemTax = Number(item.tax) || 0;
    
    subtotal += (Number(item.price) || 0) * (Number(item.quantity || item.qty) || 0);
    total_discount += Number(item.discount) || 0;
    
    const taxVal = itemSub * (itemTax / 100);
    total_cgst += taxVal / 2;
    total_sgst += taxVal / 2;
  });

  const grand_total = subtotal - total_discount + total_cgst + total_sgst;

  return {
    subtotal,
    total_discount,
    total_cgst,
    total_sgst,
    grand_total
  };
};
