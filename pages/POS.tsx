import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MenuItem, CartItem, CategoryType, OrderType, Restaurant, PaymentMethod } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Loader2, Printer, MessageSquare, CheckCircle, User, Phone, Wallet, QrCode, Tag, X, Bike, Store, CheckSquare, Square, Utensils, ShoppingBag, Receipt, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { useRestaurants } from '../context/RestaurantContext';

interface LastOrderDetails {
  id: string;
  total: number;
  items: CartItem[];
  upiUrl: string;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  discount: number;
  deliveryCharge: number;
  subtotal: number;
  taxDetails: {
      gstRate: number;
      gstAmount: number;
      serviceRate: number;
      serviceAmount: number;
  };
  restaurantIds: string[];
}

const POS: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { restaurants } = useRestaurants();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryType | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local Cart State for POS
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Multi-Restaurant Selection
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<Set<string>>(new Set());

  // Admin Order Inputs
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('Dine-in');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discount, setDiscount] = useState<string>(''); 
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  
  // Bill Modal State
  const [showBillModal, setShowBillModal] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<LastOrderDetails | null>(null);
  
  // Active Restaurant Settings
  const [restaurantData, setRestaurantData] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (restaurantId) {
        setSelectedRestaurantIds(new Set([restaurantId]));
        getDoc(doc(db, 'restaurants', restaurantId)).then(snap => {
            if(snap.exists()) {
                setRestaurantData(snap.data() as Restaurant);
            }
        });
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    const unsubscribe = onSnapshot(collection(db, 'restaurants', restaurantId, 'menu'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      setMenuItems(items);
      setFilteredItems(items);
    });
    return () => unsubscribe();
  }, [restaurantId]);

  // Handle Delivery Charge Default
  useEffect(() => {
    if (orderType === 'Delivery' && restaurantData?.defaultDeliveryCharge) {
        setDeliveryCharge(restaurantData.defaultDeliveryCharge);
    } else if (orderType !== 'Delivery') {
        setDeliveryCharge(0);
    }
  }, [orderType, restaurantData?.defaultDeliveryCharge]);

  useEffect(() => {
    let result = menuItems;
    if (activeCategory !== 'All') {
      result = result.filter(item => item.category === activeCategory);
    }
    if (searchTerm) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.id.includes(searchTerm)
      );
    }
    setFilteredItems(result);
  }, [activeCategory, searchTerm, menuItems]);

  const toggleRestaurantSelection = (id: string) => {
    const newSet = new Set(selectedRestaurantIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedRestaurantIds(newSet);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) return { ...i, quantity: Math.max(0, i.quantity + delta) };
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const startNewOrder = () => {
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setOrderType('Dine-in');
      setPaymentMethod('Cash');
      setDiscount('');
      setDeliveryCharge(0);
      setShowBillModal(false);
      setLastOrderDetails(null);
  };

  const isValidPhone = (phone: string) => /^\d{10}$/.test(phone.trim());
  const isFormValid = customerName.trim() !== '' && isValidPhone(customerPhone);

  // --- BILL CALCULATION LOGIC ---
  const calculateBill = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountAmount = parseFloat(discount) || 0;
    
    // Taxable amount (usually Post-Discount)
    const taxableAmount = Math.max(0, subtotal - discountAmount);

    let gstAmount = 0;
    let serviceAmount = 0;
    
    // Default rates if not set
    const gstRate = restaurantData?.taxSettings?.gstPercentage || 0;
    const serviceRate = restaurantData?.taxSettings?.serviceChargePercentage || 0;
    const applyTax = restaurantData?.taxSettings?.applyTax ?? false;
    
    if (applyTax) {
        if (gstRate > 0) gstAmount = taxableAmount * (gstRate / 100);
        if (serviceRate > 0) serviceAmount = taxableAmount * (serviceRate / 100);
    }

    const activeDeliveryCharge = orderType === 'Delivery' ? parseFloat(deliveryCharge.toString()) || 0 : 0;
    
    // Final Total
    const total = taxableAmount + gstAmount + serviceAmount + activeDeliveryCharge;
    
    return { 
        subtotal, 
        discountAmount, 
        gstAmount, 
        serviceAmount, 
        total, 
        gstRate, 
        serviceRate, 
        activeDeliveryCharge
    };
  };

  const { subtotal, discountAmount, gstAmount, serviceAmount, total, gstRate, serviceRate, activeDeliveryCharge } = calculateBill();

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    
    if (!isFormValid) {
        toast.error("Please enter a valid Name and 10-digit Phone Number.");
        return;
    }

    if (selectedRestaurantIds.size === 0) {
        toast.error("Please select at least one restaurant to place the order.");
        return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(`Placing order for ${selectedRestaurantIds.size} restaurant(s)...`);
    
    try {
      const promises = Array.from(selectedRestaurantIds).map(async (targetId) => {
          return addDoc(collection(db, 'restaurants', targetId, 'orders'), {
            restaurantId: targetId,
            items: cart,
            total,
            subtotal,
            discount: discountAmount,
            deliveryCharge: activeDeliveryCharge,
            taxDetails: { gstRate, gstAmount, serviceRate, serviceAmount },
            status: 'Pending',
            paymentStatus: paymentMethod === 'Online' ? 'Pending' : 'Paid',
            paymentMethod,
            orderType: orderType,
            source: 'Reception',
            orderSource: 'Admin',
            createdAt: new Date().toISOString(),
            tableNo: orderType === 'Dine-in' ? 'Walk-in' : 'N/A',
            customerName: customerName,
            customerPhone: customerPhone
          });
      });

      const results = await Promise.all(promises);
      const firstDocId = results[0].id;
      
      const upiId = restaurantData?.upiId;
      let upiUrl = '';
      if (upiId) {
          const payeeName = restaurantData?.name.replace(/ /g, '%20') || 'Restaurant';
          upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${total.toFixed(2)}&cu=INR&tn=${firstDocId}`;
      }
      
      setLastOrderDetails({ 
          id: firstDocId, 
          total, 
          items: [...cart],
          upiUrl,
          paymentMethod,
          customerName,
          customerPhone,
          discount: discountAmount,
          deliveryCharge: activeDeliveryCharge,
          subtotal,
          taxDetails: { gstRate, gstAmount, serviceRate, serviceAmount },
          restaurantIds: Array.from(selectedRestaurantIds)
      });
      
      setCart([]); 
      toast.success("Orders placed successfully!", { id: toastId });
      setShowBillModal(true);
      
    } catch (err: any) {
      console.error("POS Order Failed", err);
      toast.error("Failed to place order: " + err.message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUpi = () => {
    if (restaurantData?.upiId) {
        navigator.clipboard.writeText(restaurantData.upiId);
        toast.success('UPI ID copied to clipboard!');
    }
  };

  const handleWhatsApp = async () => {
    if (!lastOrderDetails || !restaurantData) return;
    const { 
        total, paymentMethod, customerName, customerPhone, upiUrl
    } = lastOrderDetails;

    let message = "";
    if (paymentMethod === 'Online' && upiUrl) {
        message = `Hi, please complete your payment of ₹${total.toFixed(2)} using this link: ${upiUrl}`;
    } else {
        message = `Hi ${customerName}, thanks for visiting ${restaurantData.name}! Your bill of ₹${total.toFixed(2)} is Paid.`;
    }
    const whatsappUrl = `https://wa.me/${customerPhone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex h-[calc(100vh -4rem)] bg-gray-100 overflow-hidden relative">
      <style>
        {`
        @media print {
            body * { visibility: hidden; }
            #printable-receipt, #printable-receipt * { visibility: visible; }
            #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 20px; display: block !important; }
            #no-print, .modal-overlay { display: none !important; }
        }
        `}
      </style>
      
      {/* Printable Receipt - Hidden by default */}
      <div id="printable-receipt" className="hidden">
         <div className="max-w-[300px] mx-auto text-center font-mono">
            <h2 className="text-xl font-bold mb-1">{restaurantData?.name}</h2>
            <div className="text-sm font-bold mb-2 text-left">Order #{lastOrderDetails?.id.slice(0,6)}</div>
            {(lastOrderDetails?.items || []).map(item => (
                <div key={item.id} className="flex justify-between text-sm mb-1">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
            ))}
            <div className="border-b border-dashed border-gray-400 my-4"></div>
            {lastOrderDetails && (
                <div className="space-y-1 text-right">
                    <div className="text-xs">Subtotal: ₹{lastOrderDetails.subtotal.toFixed(2)}</div>
                    {lastOrderDetails.discount > 0 && <div className="text-xs">Discount: -₹{lastOrderDetails.discount.toFixed(2)}</div>}
                    {lastOrderDetails.deliveryCharge > 0 && <div className="text-xs">Delivery: ₹{lastOrderDetails.deliveryCharge.toFixed(2)}</div>}
                    {lastOrderDetails.taxDetails.gstAmount > 0 && <div className="text-xs">GST ({lastOrderDetails.taxDetails.gstRate}%): ₹{lastOrderDetails.taxDetails.gstAmount.toFixed(2)}</div>}
                    {lastOrderDetails.taxDetails.serviceAmount > 0 && <div className="text-xs">Service ({lastOrderDetails.taxDetails.serviceRate}%): ₹{lastOrderDetails.taxDetails.serviceAmount.toFixed(2)}</div>}
                </div>
            )}
            <div className="border-b border-dashed border-gray-400 my-2"></div>
            <div className="flex justify-between font-bold text-lg mt-2 pt-2">
                <span>Total</span>
                <span>₹{lastOrderDetails?.total.toFixed(2)}</span>
            </div>
         </div>
      </div>

      {/* Success Modal */}
      {showBillModal && lastOrderDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay animate-fade-in p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-orange-600 p-4 flex justify-between items-center text-white flex-shrink-0">
                      <h3 className="font-bold text-lg flex items-center"><CheckCircle className="mr-2 h-5 w-5" /> Order Placed</h3>
                      <button onClick={startNewOrder} className="hover:bg-orange-700 p-1 rounded"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                      <div className="text-center mb-6">
                          <p className="text-gray-500 text-sm">Total Amount</p>
                          <h2 className="text-4xl font-extrabold text-gray-900 mt-1">₹{lastOrderDetails.total.toFixed(2)}</h2>
                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                             {lastOrderDetails.paymentMethod} • Admin
                          </div>
                      </div>
                      {lastOrderDetails.paymentMethod === 'Online' && lastOrderDetails.upiUrl && (
                          <div className="flex flex-col items-center justify-center mb-6 bg-white p-4 rounded-xl border-2 border-dashed border-gray-300">
                              <QRCodeSVG value={lastOrderDetails.upiUrl} size={180} />
                              <p className="text-xs text-gray-500 mt-3 flex items-center">
                                  <QrCode className="h-3 w-3 mr-1" /> Scan to Pay via UPI
                              </p>
                              <button 
                                  onClick={handleCopyUpi}
                                  className="mt-3 text-xs flex items-center justify-center px-3 py-1.5 border border-gray-200 rounded-full font-medium text-gray-600 hover:bg-gray-50"
                              >
                                 <Copy className="h-3 w-3 mr-1.5" /> Copy UPI ID
                              </button>
                          </div>
                      )}
                      <div className="space-y-3">
                          <button onClick={handlePrint} className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50">
                              <Printer className="h-4 w-4 mr-2" /> Print Receipt
                          </button>
                          <button 
                                onClick={handleWhatsApp} 
                                disabled={!lastOrderDetails.customerPhone} 
                                className="w-full flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MessageSquare className="h-4 w-4 mr-2" /> 
                                WhatsApp Bill
                          </button>
                      </div>
                      <button onClick={startNewOrder} className="w-full mt-4 py-3 text-orange-600 font-bold hover:bg-orange-50 rounded-xl">
                          Start New Order
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content (Product Grid) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-100" id="no-print">
        {/* Search Bar */}
        <div className="p-4 md:p-6 pb-0 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
           <div className="relative w-full max-w-md">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search item name or code..." 
               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white shadow-sm"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <div className="flex space-x-2 overflow-x-auto max-w-full no-scrollbar">
             {['All', 'Veg', 'Non-Veg', 'Drinks', 'Dessert'].map(cat => (
               <button
                 key={cat}
                 onClick={() => setActiveCategory(cat as any)}
                 className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition shadow-sm border ${
                   activeCategory === cat 
                     ? 'bg-[#FF5722] text-white border-[#FF5722]' 
                     : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                 }`}
               >
                 {cat}
               </button>
             ))}
           </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {filteredItems.map(item => {
               const cartItem = cart.find(c => c.id === item.id);
               const qty = cartItem ? cartItem.quantity : 0;
               return (
               <div 
                 key={item.id} 
                 onClick={() => addToCart(item)}
                 className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:border-orange-300 transition flex flex-col h-full active:scale-[0.98] group"
               >
                 <div className="h-32 w-full bg-gray-50 rounded-lg overflow-hidden mb-3 relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {qty > 0 && (
                        <div className="absolute top-2 right-2 bg-[#FF5722] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                            {qty}
                        </div>
                    )}
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</h4>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.category === 'Veg' ? 'bg-green-500' : item.category === 'Non-Veg' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    </div>
                    <p className="text-xs text-gray-500 font-medium">₹{item.price.toFixed(2)}</p>
                 </div>
               </div>
             )})}
          </div>
        </div>
      </div>

      {/* Sidebar (Right) - FIXED UI */}
      <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col h-full z-30 shadow-2xl relative" id="no-print">
        
        {/* 1. Fixed Header Section */}
        <div className="shrink-0 bg-white p-4 border-b border-gray-100 z-20 space-y-3">
            
            {/* Target Restaurant Selector */}
            <div className="flex justify-between items-center">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                    <Store className="h-3.5 w-3.5 mr-1.5" /> Target Restaurants
                 </h3>
                 <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {selectedRestaurantIds.size} Selected
                 </span>
            </div>
            {/* Horizontal Scroll for Restaurants */}
            <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
               {restaurants.map(r => (
                   <div key={r.id} onClick={() => toggleRestaurantSelection(r.id)} 
                        className={`flex-shrink-0 inline-flex items-center px-2 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-all ${selectedRestaurantIds.has(r.id) ? 'bg-orange-50 border-orange-200 text-orange-800 ring-1 ring-orange-100' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                       {selectedRestaurantIds.has(r.id) ? <CheckSquare className="h-3 w-3 mr-1.5 text-[#FF5722]"/> : <Square className="h-3 w-3 mr-1.5"/>}
                       {r.name}
                   </div>
               ))}
            </div>

            {/* Customer Inputs - GRID LAYOUT */}
            <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#FF5722] focus:border-[#FF5722] outline-none transition-all" 
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#FF5722] focus:border-[#FF5722] outline-none transition-all" 
                        placeholder="Phone Number"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                    />
                </div>
            </div>
            
            {/* Service Type Toggles */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                {['Dine-in', 'Takeaway', 'Delivery'].map(type => (
                        <button
                        key={type}
                        onClick={() => setOrderType(type as OrderType)}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all flex items-center justify-center ${
                            orderType === type 
                            ? 'bg-white text-[#FF5722] shadow-sm border border-gray-100' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        >
                            {type === 'Dine-in' && <Utensils className="h-3 w-3 mr-1"/>}
                            {type === 'Takeaway' && <ShoppingBag className="h-3 w-3 mr-1"/>}
                            {type === 'Delivery' && <Bike className="h-3 w-3 mr-1"/>}
                            {type}
                        </button>
                ))}
            </div>

            {/* Payment Toggles */}
            <div className="flex gap-2">
                <button
                    onClick={() => setPaymentMethod('Cash')}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                        paymentMethod === 'Cash' 
                        ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-100' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <Wallet className="h-3 w-3 mr-1.5" /> Cash
                </button>
                <button
                    onClick={() => setPaymentMethod('Online')}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold uppercase border transition-all ${
                        paymentMethod === 'Online' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-100' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <QrCode className="h-3 w-3 mr-1.5" /> Online
                </button>
            </div>
        </div>

        {/* 2. Scrollable Items (Body) */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 no-scrollbar relative z-10">
           {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-60">
                <div className="bg-white p-4 rounded-full shadow-sm border border-gray-100">
                    <Receipt className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium">Cart is empty</p>
             </div>
           ) : (
             cart.map(item => (
               <div key={item.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm mb-2">
                 {/* Item Image */}
                 <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden border border-gray-100">
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                 </div>

                 {/* Info */}
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate leading-tight mb-0.5">{item.name}</p>
                    <p className="text-xs text-gray-500 font-medium">₹{item.price.toFixed(2)}</p>
                 </div>

                 {/* Controls */}
                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 bg-gray-50 rounded-md p-0.5 border border-gray-200">
                        <button onClick={(e) => {e.stopPropagation(); updateQuantity(item.id, -1)}} className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-gray-600 hover:text-red-500 border border-transparent hover:border-gray-200"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-bold text-gray-900 w-5 text-center">{item.quantity}</span>
                        <button onClick={(e) => {e.stopPropagation(); updateQuantity(item.id, 1)}} className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-green-600 hover:text-green-700 border border-transparent hover:border-gray-200"><Plus className="h-3 w-3" /></button>
                    </div>
                    
                    <div className="text-right min-w-[3rem]">
                        <span className="text-sm font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>

                    <button onClick={(e) => {e.stopPropagation(); removeFromCart(item.id)}} className="text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-md">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>

        {/* 3. Fixed Footer */}
        <div className="shrink-0 p-4 bg-white border-t border-gray-200 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.03)]">
             {/* Extra Charges */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                 {orderType === 'Delivery' && (
                    <div className="relative">
                        <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Delivery</label>
                        <div className="flex items-center w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-1 focus-within:ring-[#FF5722]">
                            <span className="text-gray-500 text-sm mr-1">₹</span>
                            <input 
                                type="number"
                                className="w-full bg-transparent text-sm font-medium outline-none text-right"
                                value={deliveryCharge}
                                onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                 )}
                 <div className={`relative ${orderType !== 'Delivery' ? 'col-span-2' : ''}`}>
                    <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount (₹)</label>
                    <div className="flex items-center w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-1 focus-within:ring-[#FF5722]">
                         <Tag className="h-3 w-3 text-gray-400 mr-2" />
                        <input 
                            type="number"
                            className="w-full bg-transparent text-sm font-medium outline-none text-right"
                            placeholder="0"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                        />
                    </div>
                 </div>
            </div>

            {/* Breakdown - SPLIT TAXES */}
            <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-green-600 font-medium">
                        <span>Discount</span>
                        <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                )}
                {activeDeliveryCharge > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Delivery Fee</span>
                        <span>₹{activeDeliveryCharge.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                    <span>GST ({gstRate}%)</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Service Charge ({serviceRate}%)</span>
                    <span>₹{serviceAmount.toFixed(2)}</span>
                </div>
            </div>

            {/* Total & Button */}
            <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-sm font-bold text-gray-800">Total Payable</span>
                    <span className="text-3xl font-extrabold text-gray-900 tracking-tight">₹{total.toFixed(2)}</span>
                </div>
                
                <button 
                    onClick={handlePlaceOrder}
                    disabled={cart.length === 0 || isProcessing || !isFormValid || selectedRestaurantIds.size === 0}
                    style={{ backgroundColor: (cart.length === 0 || isProcessing || !isFormValid || selectedRestaurantIds.size === 0) ? '#d1d5db' : '#FF5722' }}
                    className="w-full text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-3 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98] mb-0"
                >
                    {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
                    <span>Generate Bill {selectedRestaurantIds.size > 1 ? `(${selectedRestaurantIds.size})` : ''}</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default POS;