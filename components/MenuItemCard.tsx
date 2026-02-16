import React from 'react';
import { Plus, Star } from 'lucide-react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import Badge from './ui/Badge';

interface MenuItemCardProps {
  item: MenuItem;
  restaurantId: string;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, restaurantId }) => {
  const { addItem, items, updateQuantity } = useCart();
  
  const cartItem = items.find(i => i.id === item.id);
  const quantity = cartItem?.quantity || 0;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex justify-between gap-4 h-full">
      <div className="flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-start space-x-2">
            <div className={`w-4 h-4 mt-1 rounded-sm border flex items-center justify-center ${item.category === 'Veg' ? 'border-green-600' : item.category === 'Non-Veg' ? 'border-red-600' : 'border-blue-600'}`}>
              <div className={`w-2 h-2 rounded-full ${item.category === 'Veg' ? 'bg-green-600' : item.category === 'Non-Veg' ? 'bg-red-600' : 'bg-blue-600'}`} />
            </div>
            {item.isBestseller && (
              <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                Bestseller
              </span>
            )}
          </div>
          
          <h3 className="font-bold text-gray-900 mt-2 text-lg">{item.name}</h3>
          <div className="font-semibold text-gray-700 mt-1">₹{item.price.toFixed(2)}</div>
          
          {item.rating && (
            <div className="flex items-center mt-1">
               <div className="flex text-xs text-yellow-500">
                 {[...Array(5)].map((_, i) => (
                   <Star key={i} className={`h-3 w-3 ${i < Math.round(item.rating!) ? 'fill-current' : 'text-gray-300'}`} />
                 ))}
               </div>
               <span className="text-xs text-gray-400 ml-1">({item.votes})</span>
            </div>
          )}

          <p className="text-gray-500 text-sm mt-3 line-clamp-2">{item.description}</p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-3 relative w-32 flex-shrink-0">
        <div className="w-32 h-28 rounded-xl overflow-hidden relative bg-gray-100">
           <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
        
        <div className="absolute -bottom-3 w-24 shadow-lg bg-white rounded-lg overflow-hidden border border-gray-100">
          {quantity === 0 ? (
            <button 
              onClick={() => addItem(item, restaurantId)}
              className="w-full py-2 text-green-600 font-bold text-sm hover:bg-green-50 uppercase"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center justify-between bg-white w-full">
              <button 
                onClick={() => updateQuantity(item.id, -1)}
                className="px-3 py-2 text-gray-500 hover:text-green-600 hover:bg-green-50 font-bold text-lg"
              >
                -
              </button>
              <span className="text-sm font-bold text-green-700">{quantity}</span>
              <button 
                onClick={() => updateQuantity(item.id, 1)}
                className="px-3 py-2 text-green-600 hover:bg-green-50 font-bold text-lg"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
