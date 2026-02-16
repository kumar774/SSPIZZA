import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MenuItem, CategoryType } from '../types';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, CheckSquare, Square, Store } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useRestaurants } from '../context/RestaurantContext';
import { toast } from 'react-hot-toast';

const MenuManager: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { restaurants } = useRestaurants(); 
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Multi-Restaurant Selection State
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<Set<string>>(new Set());

  // Form State
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: 'Non-Veg',
    image: '',
    available: true
  });
  
  const currentRestaurant = restaurants.find(r => r.id === restaurantId);

  useEffect(() => {
    if (!restaurantId) return;

    // Real-time listener for CURRENT dashboard menu items
    const menuRef = collection(db, 'restaurants', restaurantId, 'menu');
    const unsubscribe = onSnapshot(menuRef, (snapshot) => {
      const menuData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MenuItem[];
      setItems(menuData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurantId]);

  const handleOpenModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
      // When editing, we focus only on the current item
      setSelectedRestaurantIds(new Set([restaurantId!])); 
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'Non-Veg',
        image: 'https://picsum.photos/400/300',
        available: true
      });
      // Default: Select current restaurant, but allow it to be unchecked later
      if (restaurantId) setSelectedRestaurantIds(new Set([restaurantId]));
    }
    setIsModalOpen(true);
  };

  const toggleRestaurantSelection = (id: string) => {
    if (editingItem) return; // Disable toggling during edit
    
    // Removed restriction preventing unchecking of current restaurant
    
    const newSet = new Set(selectedRestaurantIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRestaurantIds(newSet);
  };

  const handleSelectAll = () => {
    if (editingItem) return;
    const allIds = restaurants.map(r => r.id);
    setSelectedRestaurantIds(new Set(allIds));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) {
        toast.error("No restaurant ID found.");
        return;
    }

    if (!editingItem && selectedRestaurantIds.size === 0) {
        toast.error("Please select at least one restaurant.");
        return;
    }

    const toastId = toast.loading(editingItem ? "Updating item..." : `Adding item to ${selectedRestaurantIds.size} restaurants...`);

    try {
      if (editingItem && editingItem.id) {
        // Update Existing Item (Single Restaurant)
        const itemRef = doc(db, 'restaurants', restaurantId, 'menu', editingItem.id);
        await updateDoc(itemRef, formData);
        toast.success("Menu item updated!", { id: toastId });
      } else {
        // Create New Item (Potential Multi-Restaurant)
        const promises = Array.from(selectedRestaurantIds).map(async (targetId) => {
           const menuRef = collection(db, 'restaurants', targetId, 'menu');
           await addDoc(menuRef, {
            ...formData,
            votes: 0,
            rating: 0
           });
        });

        await Promise.all(promises);
        toast.success(`Item added to ${selectedRestaurantIds.size} restaurants successfully!`, { id: toastId });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving menu item:", error);
      toast.error("Failed to save item: " + error.message, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurantId) return;
    try {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'menu', id));
      toast.success("Item deleted successfully");
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading menu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 flex items-center">
             Menu Management 
             <span className="ml-3 text-xs font-normal bg-orange-100 text-orange-800 px-2 py-1 rounded-full border border-orange-200">
               {currentRestaurant?.name}
             </span>
           </h2>
           <p className="text-gray-500 text-sm">Manage food items for {currentRestaurant?.name}.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </button>
      </div>

      {/* Menu List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                                <img className="h-10 w-10 rounded-lg object-cover bg-gray-100" src={item.image} alt="" />
                            </div>
                            <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                             ${item.category === 'Veg' ? 'bg-green-100 text-green-800' : 
                               item.category === 'Non-Veg' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                             {item.category}
                         </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        {item.available !== false ? (
                            <Badge variant="success">Available</Badge>
                        ) : (
                            <Badge variant="error">Out of Stock</Badge>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in my-8">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">
                        {editingItem ? 'Edit Item' : 'Add New Item'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column - Details */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                        value={formData.price}
                                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select 
                                        className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value as CategoryType})}
                                    >
                                        <option value="Veg">Veg</option>
                                        <option value="Non-Veg">Non-Veg</option>
                                        <option value="Drinks">Drinks</option>
                                        <option value="Dessert">Dessert</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            className="w-full rounded-lg border-gray-300 border pl-9 pr-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                            value={formData.image}
                                            onChange={(e) => setFormData({...formData, image: e.target.value})}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea 
                                    rows={3}
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div className="flex items-center">
                                <input 
                                    id="available"
                                    type="checkbox"
                                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                    checked={formData.available !== false}
                                    onChange={(e) => setFormData({...formData, available: e.target.checked})}
                                />
                                <label htmlFor="available" className="ml-2 block text-sm text-gray-900">
                                    Available for order
                                </label>
                            </div>
                        </div>

                        {/* Right Column - Restaurant Selection */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center">
                                    <Store className="h-4 w-4 mr-2 text-gray-500" />
                                    Publish to Restaurants
                                </h4>
                                {!editingItem && (
                                    <button 
                                        type="button"
                                        onClick={handleSelectAll}
                                        className="text-xs text-orange-600 font-medium hover:underline"
                                    >
                                        Select All
                                    </button>
                                )}
                            </div>
                            
                            {editingItem ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-4 border border-dashed border-gray-200 rounded-lg bg-white">
                                    <Edit2 className="h-8 w-8 mb-2 opacity-50" />
                                    <p className="text-sm">Editing is restricted to the current restaurant to maintain data integrity.</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-2 custom-scrollbar">
                                    {restaurants.map(r => (
                                        <div 
                                            key={r.id}
                                            onClick={() => toggleRestaurantSelection(r.id)}
                                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                                selectedRestaurantIds.has(r.id) 
                                                ? 'bg-orange-50 border-orange-200' 
                                                : 'bg-white border-gray-200 hover:border-orange-200'
                                            }`}
                                        >
                                            <div className={`mr-3 ${selectedRestaurantIds.has(r.id) ? 'text-orange-600' : 'text-gray-300'}`}>
                                                {selectedRestaurantIds.has(r.id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${selectedRestaurantIds.has(r.id) ? 'text-orange-900' : 'text-gray-700'}`}>
                                                    {r.name}
                                                </p>
                                                {r.id === restaurantId && (
                                                    <p className="text-[10px] text-gray-400">Currently Managing</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {!editingItem && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-xs text-gray-500">
                                        Selected: <span className="font-bold text-gray-900">{selectedRestaurantIds.size}</span> restaurants
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-orange-600 rounded-lg text-sm font-medium text-white hover:bg-orange-700 shadow-sm"
                        >
                            {editingItem ? 'Update Item' : 'Add Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default MenuManager;