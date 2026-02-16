import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRestaurants } from '../context/RestaurantContext';
import { Edit, Trash2, Plus, Loader2, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { deleteDoc, doc, getDocs, collection, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-hot-toast';

const RestaurantList: React.FC = () => {
  const { restaurants, loading } = useRestaurants();
  const navigate = useNavigate();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    setDeleteLoading(id);
    const toastId = toast.loading(`Removing ${name}...`);

    try {
        // 1. Direct Firebase Delete
        const restaurantRef = doc(db, 'restaurants', id);
        await deleteDoc(restaurantRef);
        
        // 2. The useRestaurants context has an onSnapshot listener
        // It will automatically detect this change and update the 'restaurants' list prop.
        // We do not need to manually filter local state if the context is working correctly.
        
        toast.success(`Restaurant "${name}" deleted permanently.`, { id: toastId });
    } catch (err: any) {
        console.error("[RestaurantList] Error deleting restaurant:", err);
        toast.error(`Failed to delete: ${err.message}`, { id: toastId });
    } finally {
        setDeleteLoading(null);
    }
  };

  const handleCleanData = async () => {
    if (!window.confirm("This will scan for malformed or 'ghost' restaurant records (missing names/IDs) and delete them. Continue?")) return;
    
    setCleaning(true);
    const toastId = toast.loading("Scanning for ghost records...");
    
    try {
        const querySnapshot = await getDocs(collection(db, "restaurants"));
        const batch = writeBatch(db);
        let count = 0;

        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            // Check for invalid records (no name, or no ID matching doc ID if that was enforced, or empty objects)
            if (!data.name || data.name.trim() === '') {
                batch.delete(doc(db, "restaurants", docSnapshot.id));
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            toast.success(`Cleaned up ${count} ghost/invalid records.`, { id: toastId });
        } else {
            toast.success("Database is clean. No ghost records found.", { id: toastId });
        }
    } catch (error: any) {
        console.error("Cleanup error:", error);
        toast.error("Failed to clean data: " + error.message, { id: toastId });
    } finally {
        setCleaning(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-orange-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Restaurant Management</h2>
          <p className="text-gray-500 text-sm">View and manage all registered restaurants.</p>
        </div>
        <div className="flex gap-2">
            <button 
            onClick={handleCleanData}
            disabled={cleaning}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium flex items-center transition shadow-sm"
            title="Remove invalid records"
            >
            {cleaning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Clean Data
            </button>
            <button 
            onClick={() => navigate(`/dashboard/${restaurantId}/restaurants/new`)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition shadow-sm"
            >
            <Plus className="h-4 w-4 mr-2" /> Add Restaurant
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Live Link</th>
                 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-200">
               {restaurants.map((r) => (
                 <tr key={r.id} className="hover:bg-gray-50 transition">
                   <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                         <div className="h-10 w-10 flex-shrink-0">
                            <img className="h-10 w-10 rounded-full object-cover border border-gray-200 bg-gray-100" src={r.logo} alt="" />
                         </div>
                         <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{r.name}</div>
                            <div className="text-xs text-gray-500">ID: {r.id.substring(0,6)}...</div>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {r.location}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {r.contact || 'N/A'}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                      <a href={`#/restaurant/${r.slug}`} target="_blank" rel="noreferrer" className="flex items-center hover:underline">
                         View <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => navigate(`/dashboard/${restaurantId}/restaurants/edit/${r.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(r.id, r.name)}
                        className="text-red-600 hover:text-red-900"
                        disabled={deleteLoading === r.id}
                        title="Delete"
                      >
                        {deleteLoading === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                   </td>
                 </tr>
               ))}
               {restaurants.length === 0 && (
                   <tr>
                       <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                           <div className="flex flex-col items-center justify-center p-4">
                               <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
                               <p>No restaurants found.</p>
                           </div>
                       </td>
                   </tr>
               )}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default RestaurantList;