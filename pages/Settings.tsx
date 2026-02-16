import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Restaurant, ThemeSettings, TaxSettings, SocialLinks } from '../types';
import { Save, Loader2, Clock, Palette, QrCode, Layout, Smartphone, Bike } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Settings: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'operational' | 'branding'>('operational');
  
  const [formData, setFormData] = useState({
    openingHours: '',
    deliveryTime: '',
    defaultDeliveryCharge: 0,
    whatsappNumber: '',
    upiId: '',
    receiptFooter: '',
    // Theme Settings
    theme: {
      headerColor: '#ffffff',
      footerColor: '#111827',
      headerText: 'CraveWave',
      footerText: '© 2024 CraveWave Technologies Inc.',
      logoUrl: '',
      heroTitle: 'Delicious Food Delivered',
      heroSubtitle: 'Order from the best local menu instantly.',
      primaryColor: '#ea580c' // Default Orange-600
    } as ThemeSettings,
    // Tax Settings (Simplified access for this view)
    taxSettings: {
        gstPercentage: 5,
        serviceChargePercentage: 0,
        applyTax: true
    } as TaxSettings,
    socialMedia: {
        instagram: '',
        facebook: ''
    } as SocialLinks
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!restaurantId) return;
      const docRef = doc(db, 'restaurants', restaurantId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as Restaurant;
        setFormData({
            openingHours: data.openingHours || '09:00 AM - 10:00 PM',
            deliveryTime: data.deliveryTime || '30-45 mins',
            defaultDeliveryCharge: data.defaultDeliveryCharge || 0,
            whatsappNumber: data.whatsappNumber || '',
            upiId: data.upiId || '',
            receiptFooter: data.receiptFooter || 'Thank you for dining with us!',
            theme: {
              headerColor: data.theme?.headerColor || '#ffffff',
              footerColor: data.theme?.footerColor || '#111827',
              headerText: data.theme?.headerText || data.name || 'CraveWave',
              footerText: data.theme?.footerText || '© 2024 CraveWave Technologies Inc.',
              logoUrl: data.theme?.logoUrl || data.logo || '',
              heroTitle: data.theme?.heroTitle || `Welcome to ${data.name}`,
              heroSubtitle: data.theme?.heroSubtitle || 'Experience the best flavors in town.',
              primaryColor: data.theme?.primaryColor || '#ea580c'
            },
            taxSettings: {
                gstPercentage: data.taxSettings?.gstPercentage ?? 5,
                serviceChargePercentage: data.taxSettings?.serviceChargePercentage ?? 0,
                applyTax: data.taxSettings?.applyTax ?? true
            },
            socialMedia: {
                instagram: data.socialMedia?.instagram || '',
                facebook: data.socialMedia?.facebook || ''
            }
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, [restaurantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;
    setSaving(true);
    const toastId = toast.loading("Saving settings...");

    try {
      const docRef = doc(db, 'restaurants', restaurantId);
      await updateDoc(docRef, formData);
      toast.success("Settings updated successfully!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to update settings: " + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
        activeTab === id 
          ? 'border-orange-600 text-orange-600 bg-orange-50' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Configure Restaurant</h2>
        <p className="text-gray-500 text-sm">Manage operations, payments, and front-page appearance.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
            <TabButton id="operational" label="Operations & Billing" icon={QrCode} />
            <TabButton id="branding" label="Front-Page CMS" icon={Layout} />
        </div>

        <form onSubmit={handleSave} className="p-6">
            
            {/* Operational Tab */}
            {activeTab === 'operational' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <h4 className="font-bold text-orange-800 flex items-center mb-2">
                            <QrCode className="h-4 w-4 mr-2" /> Payment Settings
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (VPA)</label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                    value={formData.upiId}
                                    onChange={(e) => setFormData({...formData, upiId: e.target.value})}
                                    placeholder="username@okicici"
                                />
                                <p className="text-xs text-gray-500 mt-1">Required for QR Code generation on Bill.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Order Number</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        className="w-full rounded-lg border-gray-300 border pl-9 pr-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                        value={formData.whatsappNumber}
                                        onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hours</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    className="w-full rounded-lg border-gray-300 border pl-9 pr-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                    value={formData.openingHours}
                                    onChange={(e) => setFormData({...formData, openingHours: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Avg. Delivery Time</label>
                            <input 
                                type="text" 
                                className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                value={formData.deliveryTime}
                                onChange={(e) => setFormData({...formData, deliveryTime: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Delivery Charge (₹)</label>
                            <div className="relative">
                                <Bike className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input 
                                    type="number" 
                                    className="w-full rounded-lg border-gray-300 border pl-9 pr-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                    value={formData.defaultDeliveryCharge}
                                    onChange={(e) => setFormData({...formData, defaultDeliveryCharge: parseFloat(e.target.value)})}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h4 className="font-bold text-gray-900 mb-4">Tax Configuration</h4>
                        <div className="flex items-center gap-4 mb-4">
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.taxSettings.applyTax}
                                    onChange={(e) => setFormData({...formData, taxSettings: {...formData.taxSettings, applyTax: e.target.checked}})}
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                <span className="ms-3 text-sm font-medium text-gray-700">Apply Tax on Bills</span>
                            </label>
                        </div>
                        <div className={`grid grid-cols-2 gap-6 ${!formData.taxSettings.applyTax ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
                                <input 
                                    type="number" 
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm"
                                    value={formData.taxSettings.gstPercentage}
                                    onChange={(e) => setFormData({...formData, taxSettings: {...formData.taxSettings, gstPercentage: parseFloat(e.target.value)}})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service Charge %</label>
                                <input 
                                    type="number" 
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm"
                                    value={formData.taxSettings.serviceChargePercentage}
                                    onChange={(e) => setFormData({...formData, taxSettings: {...formData.taxSettings, serviceChargePercentage: parseFloat(e.target.value)}})}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                            <Layout className="h-4 w-4 mr-2 text-gray-500" /> Hero Section (Front Page)
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                    value={formData.theme.heroTitle}
                                    onChange={(e) => setFormData({...formData, theme: {...formData.theme, heroTitle: e.target.value}})}
                                    placeholder="e.g. Delicious Food Delivered"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
                                <textarea 
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                    value={formData.theme.heroSubtitle}
                                    onChange={(e) => setFormData({...formData, theme: {...formData.theme, heroSubtitle: e.target.value}})}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                            <Palette className="h-4 w-4 mr-2 text-gray-500" /> Colors & Footer
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Brand Color</label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="color" 
                                        className="h-10 w-16 p-0 border border-gray-300 rounded cursor-pointer"
                                        value={formData.theme.primaryColor}
                                        onChange={(e) => setFormData({...formData, theme: {...formData.theme, primaryColor: e.target.value}})}
                                    />
                                    <input 
                                        type="text" 
                                        className="flex-1 rounded-lg border-gray-300 border px-3 py-2 text-sm uppercase"
                                        value={formData.theme.primaryColor}
                                        onChange={(e) => setFormData({...formData, theme: {...formData.theme, primaryColor: e.target.value}})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer Note</label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-lg border-gray-300 border px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                                    value={formData.receiptFooter}
                                    onChange={(e) => setFormData({...formData, receiptFooter: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-100 mt-6">
                <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-6 rounded-lg transition shadow-sm disabled:opacity-70"
                >
                    {saving ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                        </>
                    )}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;