import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, onSnapshot, updateDoc, doc, query, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Order, OrderStatus, Restaurant, PaymentMethod } from '../types';
import { Clock, CheckCircle, ChefHat, ShoppingBag, CheckSquare, Bike, Utensils, ShoppingBag as BagIcon, Trash2, AlertTriangle, Store, Globe, Monitor } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Orders: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [restaurantName, setRestaurantName] = useState('Restaurant');
  
  // Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (restaurantId) {
        getDoc(doc(db, 'restaurants', restaurantId)).then(snap => {
            if (snap.exists()) setRestaurantName((snap.data() as Restaurant).name);
        });
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;

    const ordersRef = collection(db, 'restaurants', restaurantId, 'orders');
    const q = query(ordersRef); 
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setOrders(fetchedOrders);
    });

    return () => unsubscribe();
  }, [restaurantId]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!restaurantId) return;
    try {
      const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleMarkPaid = async (order: Order) => {
      if (!restaurantId) return;
      const toastId = toast.loading("Updating payment...");
      try {
          const orderRef = doc(db, 'restaurants', restaurantId, 'orders', order.id);
          
          await updateDoc(orderRef, { paymentStatus: 'Paid' });
          toast.success("Marked as Paid", { id: toastId });

          if (order.customerPhone) {
              const customer = order.customerName || 'Customer';
              const amount = order.total.toFixed(2);
              const msg = `Hi ${customer}, Payment Received! We have received your payment of ₹${amount} for order #${order.id.slice(0,6)} at ${restaurantName}. Thank you!`;
              
              window.open(`https://api.whatsapp.com/send?phone=${order.customerPhone.replace(/\D/g,'')}&text=${encodeURIComponent(msg)}`, '_blank');
          }
      } catch (err: any) {
          toast.error("Failed to update payment", { id: toastId });
      }
  };

  const confirmDelete = (orderId: string) => {
      setOrderToDelete(orderId);
      setShowDeleteModal(true);
  };

  const executeDelete = async () => {
      if (!restaurantId || !orderToDelete) return;
      const toastId = toast.loading("Deleting order...");
      try {
          await deleteDoc(doc(db, 'restaurants', restaurantId, 'orders', orderToDelete));
          toast.success("Order deleted successfully", { id: toastId });
          setShowDeleteModal(false);
          setOrderToDelete(null);
      } catch (err: any) {
          toast.error("Failed to delete order: " + err.message, { id: toastId });
      }
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
    
    const orderDate = new Date(o.createdAt);
    let matchesStart = true;
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        matchesStart = orderDate >= start;
    }
    let matchesEnd = true;
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        matchesEnd = orderDate <= end;
    }

    return matchesStatus && matchesStart && matchesEnd;
  });

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Ready': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderTypeIcon = (type: string) => {
      switch(type) {
          case 'Delivery': return <Bike className="h-3 w-3 mr-1" />;
          case 'Takeaway': return <BagIcon className="h-3 w-3 mr-1" />;
          default: return <Utensils className="h-3 w-3 mr-1" />;
      }
  };

  const getSourceBadge = (order: Order) => {
      const isWebsite = order.orderSource === 'Website' || order.source === 'Online';
      return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center border ${isWebsite ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
              {isWebsite ? <Globe className="h-3 w-3 mr-1" /> : <Monitor className="h-3 w-3 mr-1" />}
              {isWebsite ? 'Website' : 'Admin'}
          </span>
      );
  };
  
  const getPaymentBadge = (method?: PaymentMethod) => {
    const isCash = method === 'Cash';
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center border ${isCash ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
            {isCash ? '💵' : '💳'} <span className="ml-1">{method || 'N/A'}</span>
        </span>
    );
  };

  return (
    <div className="space-y-6 relative">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                      <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Order?</h3>
                  <p className="text-sm text-gray-500 mb-6">
                      Are you sure you want to delete this order? This action cannot be undone.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                      <button
                          onClick={() => setShowDeleteModal(false)}
                          className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={executeDelete}
                          className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:text-sm"
                      >
                          Delete
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Live Orders</h2>
           <p className="text-sm text-gray-500">Manage orders for <span className="font-bold text-orange-600">{restaurantName}</span>.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            {/* Date Filters */}
            <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm border-none focus:ring-0 text-gray-600 bg-transparent p-1 outline-none"
                />
                <span className="text-gray-300">-</span>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm border-none focus:ring-0 text-gray-600 bg-transparent p-1 outline-none"
                />
                {(startDate || endDate) && (
                    <button onClick={() => {setStartDate(''); setEndDate('');}} className="text-xs text-red-500 hover:text-red-700 px-2">Clear</button>
                )}
            </div>

            {/* Status Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg overflow-x-auto no-scrollbar">
            {['All', 'Pending', 'Preparing', 'Ready', 'Completed'].map((status) => (
                <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${
                    filterStatus === status 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                >
                {status}
                </button>
            ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {filteredOrders.length === 0 ? (
           <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No orders found.</p>
           </div>
         ) : (
           filteredOrders.map(order => (
             <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col hover:shadow-md transition relative group">
                
                <button 
                    onClick={() => confirmDelete(order.id)}
                    className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Order"
                >
                    <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex justify-between items-start mb-4 pr-8">
                   <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-lg text-gray-900">#{order.id.slice(0,6)}</span>
                        {getSourceBadge(order)}
                        {getPaymentBadge(order.paymentMethod)}
                      </div>
                      <div className="flex flex-col space-y-1">
                          <div className="text-xs text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div className="text-xs font-bold text-gray-700 flex items-center uppercase">
                            {getOrderTypeIcon(order.orderType)}
                            {order.orderType}
                          </div>
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {order.paymentStatus === 'Paid' ? 'PAID' : 'PENDING'}
                        </div>
                   </div>
                </div>

                <div className="flex-1 space-y-3 mb-4">
                   {order.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-sm">
                        <div className="flex space-x-2">
                           <span className="font-bold text-gray-900 w-5">{item.quantity}x</span>
                           <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="text-gray-900 font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                     </div>
                   ))}
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-1 mb-4 bg-gray-50 -mx-5 px-5 py-3">
                   {order.subtotal && (
                       <div className="flex justify-between items-center text-xs text-gray-500">
                         <span>Subtotal</span>
                         <span>₹{order.subtotal.toFixed(2)}</span>
                       </div>
                   )}
                   
                   {order.discount && order.discount > 0 ? (
                       <div className="flex justify-between items-center text-xs text-green-600">
                         <span>Discount</span>
                         <span>-₹{order.discount.toFixed(2)}</span>
                       </div>
                   ) : null}
                   
                   {order.deliveryCharge && order.deliveryCharge > 0 ? (
                       <div className="flex justify-between items-center text-xs text-gray-600">
                         <span>Delivery Charge</span>
                         <span>₹{order.deliveryCharge.toFixed(2)}</span>
                       </div>
                   ) : null}

                   {order.taxDetails?.gstAmount > 0 && (
                        <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>GST ({order.taxDetails.gstRate}%)</span>
                            <span>₹{order.taxDetails.gstAmount.toFixed(2)}</span>
                        </div>
                   )}
                   
                   {order.taxDetails?.serviceAmount > 0 && (
                        <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Service Chg. ({order.taxDetails.serviceRate}%)</span>
                            <span>₹{order.taxDetails.serviceAmount.toFixed(2)}</span>
                        </div>
                   )}

                   <div className="flex justify-between items-center border-t border-gray-200 pt-1 mt-1">
                      <span className="text-gray-500 text-sm">Total</span>
                      <span className="text-xl font-bold text-gray-900">₹{order.total.toFixed(2)}</span>
                   </div>
                </div>

                {order.paymentStatus !== 'Paid' && (
                    <button 
                        onClick={() => handleMarkPaid(order)}
                        className="w-full mb-3 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center transition shadow-sm"
                    >
                        <CheckSquare className="h-4 w-4 mr-2" /> 
                        Mark Payment as Paid
                    </button>
                )}

                <div className="grid grid-cols-2 gap-2 mt-auto">
                   {order.status === 'Pending' && (
                     <button onClick={() => updateStatus(order.id, 'Preparing')} className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                        <ChefHat className="h-4 w-4 mr-2" /> Start Preparing
                     </button>
                   )}
                   {order.status === 'Preparing' && (
                     <button onClick={() => updateStatus(order.id, 'Ready')} className="col-span-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                        <CheckCircle className="h-4 w-4 mr-2" /> Mark Ready
                     </button>
                   )}
                   {order.status === 'Ready' && (
                     <button onClick={() => updateStatus(order.id, 'Completed')} className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium flex justify-center items-center">
                        <CheckCircle className="h-4 w-4 mr-2" /> Complete Order
                     </button>
                   )}
                   {order.status === 'Completed' && (
                     <div className="col-span-2 text-center text-sm text-green-600 font-bold py-2 bg-green-50 rounded-lg">
                        Completed
                     </div>
                   )}
                </div>
             </div>
           ))
         )}
      </div>
    </div>
  );
};

export default Orders;