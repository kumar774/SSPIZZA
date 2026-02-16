import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Plus, Minus, ArrowRight, Loader2, CheckCircle, Bike, Utensils, Download, User, Phone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-hot-toast';
import { OrderType, Restaurant } from '../types';
import { jsPDF } from "jspdf";

const CartDrawer: React.FC = () => {
  const { items, restaurantId, isOpen, toggleCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Order Configuration State
  const [orderType, setOrderType] = useState<OrderType>('Dine-in');
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState(0);
  const [restaurantName, setRestaurantName] = useState('Restaurant');
  
  // Tax Settings State
  const [taxSettings, setTaxSettings] = useState({ gstPercentage: 0, serviceChargePercentage: 0, applyTax: false });

  // Guest Details
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  
  // Success Modal Data
  const [lastOrderData, setLastOrderData] = useState<{id: string, total: number, items: any[], date: string, orderType: string, deliveryFee: number} | null>(null);

  // 1. Fetch Restaurant Settings on Open
  useEffect(() => {
    const fetchSettings = async () => {
        if (!restaurantId) return;
        try {
            const docSnap = await getDoc(doc(db, 'restaurants', restaurantId));
            if (docSnap.exists()) {
                const data = docSnap.data() as Restaurant;
                setDefaultDeliveryCharge(data.defaultDeliveryCharge || 0);
                setRestaurantName(data.name || 'Restaurant');
                
                if (data.taxSettings) {
                    setTaxSettings(data.taxSettings);
                }
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        }
    };
    if (isOpen) {
        fetchSettings();
    }
  }, [restaurantId, isOpen]);

  // 2. Calculation Logic
  const deliveryFee = orderType === 'Delivery' ? defaultDeliveryCharge : 0;
  
  // Explicitly calculate split taxes
  let gstAmount = 0;
  let serviceAmount = 0;

  if (taxSettings.applyTax) {
      if (taxSettings.gstPercentage > 0) {
          gstAmount = totalPrice * (taxSettings.gstPercentage / 100);
      }
      if (taxSettings.serviceChargePercentage > 0) {
          serviceAmount = totalPrice * (taxSettings.serviceChargePercentage / 100);
      }
  }
  
  const finalTotal = totalPrice + gstAmount + serviceAmount + deliveryFee;

  // 3. Validation
  const isValidPhone = (phone: string) => /^\d{10}$/.test(phone.trim());
  const isFormValid = guestName.trim() !== '' && isValidPhone(guestPhone);

  const generateReceiptPDF = () => {
      if (!lastOrderData) return;
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(restaurantName, 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text("Receipt / Bill", 105, 30, { align: "center" });
      doc.text(`Order ID: #${lastOrderData.id.slice(0, 8)}`, 20, 45);
      doc.text(`Date: ${new Date(lastOrderData.date).toLocaleString()}`, 20, 52);
      doc.save(`receipt_${lastOrderData.id.slice(0,6)}.pdf`);
  };

  const handleCheckout = async () => {
    if (!restaurantId) return;

    if (!isFormValid) {
        toast.error("Please enter Name and a valid 10-digit Phone Number.");
        return;
    }
    
    setIsCheckingOut(true);
    const toastId = toast.loading("Processing order...");
    
    try {
      const now = new Date().toISOString();
      const orderPayload = {
        restaurantId,
        items,
        subtotal: totalPrice,
        deliveryCharge: deliveryFee,
        total: finalTotal,
        discount: 0,
        // Detailed Tax Breakdown Payload
        taxDetails: {
            gstRate: taxSettings.gstPercentage,
            gstAmount,
            serviceRate: taxSettings.serviceChargePercentage,
            serviceAmount
        },
        status: 'Pending',
        orderType: orderType,
        source: 'Online',
        orderSource: 'Website',
        paymentStatus: 'Pending', 
        createdAt: now,
        customerName: guestName,
        customerPhone: guestPhone
      };

      const docRef = await addDoc(collection(db, 'restaurants', restaurantId, 'orders'), orderPayload);
      
      setLastOrderData({
          id: docRef.id,
          total: finalTotal,
          items: [...items],
          date: now,
          orderType: orderType,
          deliveryFee: deliveryFee
      });

      toast.success("Order Placed Successfully!", { id: toastId });
      clearCart();
      setIsCheckingOut(false);
      setOrderType('Dine-in'); 
      setGuestName('');
      setGuestPhone('');
      
    } catch (error: any) {
      console.error("Checkout failed", error);
      toast.error("Checkout failed: " + error.message, { id: toastId });
      setIsCheckingOut(false);
    }
  };

  if (lastOrderData && isOpen) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h3>
                <p className="text-gray-500 text-sm mb-6">
                    Your order #{lastOrderData.id.slice(0,6)} has been received. 
                    <br/>Total: <span className="font-bold text-gray-900">₹{lastOrderData.total.toFixed(2)}</span>
                </p>
                <button 
                    onClick={generateReceiptPDF}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 mb-3"
                >
                    <Download className="h-4 w-4 mr-2" /> Download Receipt
                </button>
                <button 
                    onClick={() => { setLastOrderData(null); toggleCart(); }}
                    className="w-full py-3 text-[#FF5722] font-bold hover:bg-orange-50 rounded-xl"
                >
                    Close
                </button>
            </div>
        </div>
      );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={toggleCart} />
      <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
        <div className="w-full h-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
          
          {/* 1. Header (Fixed) */}
          <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-20">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems} items
              </span>
            </div>
            <button onClick={toggleCart} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* 2. Scrollable Items (Body) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-gray-50/30 z-0">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                <div className="bg-gray-50 p-6 rounded-full">
                  <ShoppingBag className="h-12 w-12 text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Your cart is empty</h3>
                  <p className="text-gray-500 text-sm mt-1">Looks like you haven't added anything yet.</p>
                </div>
                <button onClick={toggleCart} className="text-[#FF5722] font-bold hover:underline">
                  Start Browsing
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  {/* Item Image */}
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-100">
                     <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500 font-medium">₹{item.price.toFixed(2)}</p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-gray-600 hover:text-red-500"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-bold text-gray-900 w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-green-600 hover:text-green-700"><Plus className="h-3 w-3" /></button>
                     </div>
                     <span className="text-sm font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 3. Footer (Fixed) */}
          {items.length > 0 && (
            <div className="shrink-0 bg-white p-4 border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] z-20">
                <div className="space-y-4 mb-4">
                   <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Customer Name"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#FF5722] outline-none"
                            />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input 
                                type="tel"
                                placeholder="Phone Number"
                                value={guestPhone}
                                onChange={(e) => setGuestPhone(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#FF5722] outline-none"
                            />
                        </div>
                   </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['Dine-in', 'Takeaway', 'Delivery'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setOrderType(type as OrderType)}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all flex items-center justify-center ${
                                    orderType === type 
                                    ? 'bg-white text-[#FF5722] shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {type === 'Dine-in' && <Utensils className="h-3 w-3 mr-1"/>}
                                {type !== 'Dine-in' && <Bike className="h-3 w-3 mr-1"/>}
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5 pt-4 border-t border-dashed border-gray-200 mb-4">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Subtotal</span>
                        <span>₹{totalPrice.toFixed(2)}</span>
                    </div>
                    {deliveryFee > 0 && (
                        <div className="flex justify-between text-xs text-gray-900 font-bold">
                            <span>Delivery Fee</span>
                            <span>₹{deliveryFee.toFixed(2)}</span>
                        </div>
                    )}
                    {gstAmount > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>GST ({taxSettings.gstPercentage}%)</span>
                            <span>₹{gstAmount.toFixed(2)}</span>
                        </div>
                    )}
                    {serviceAmount > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Service Charge ({taxSettings.serviceChargePercentage}%)</span>
                            <span>₹{serviceAmount.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-end mb-4 pt-2 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-800">Total Payable</span>
                    <span className="text-2xl font-extrabold text-gray-900 tracking-tight">₹{finalTotal.toFixed(2)}</span>
                </div>

                <button 
                    onClick={handleCheckout}
                    disabled={isCheckingOut || !isFormValid}
                    style={{ backgroundColor: (isCheckingOut || !isFormValid) ? '#d1d5db' : '#FF5722' }}
                    className="w-full text-white py-4 rounded-xl font-bold hover:brightness-95 transition flex items-center justify-between px-6 shadow-lg disabled:cursor-not-allowed mb-0"
                >
                    {isCheckingOut ? (
                    <div className="flex items-center justify-center w-full">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing...
                    </div>
                    ) : (
                    <>
                        <span>Confirm Order</span>
                        <span className="flex items-center text-orange-100 text-sm">
                        ₹{finalTotal.toFixed(2)} <ArrowRight className="ml-2 h-4 w-4" />
                        </span>
                    </>
                    )}
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;