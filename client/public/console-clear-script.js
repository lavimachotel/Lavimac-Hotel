// Hotel Management System - Clear Browser Storage Script
// Run this in your browser console (F12 → Console tab) to fix IndexedDB version errors

console.log('🧹 Starting Hotel Management System storage cleanup...');

async function clearHotelManagementStorage() {
    let clearCount = 0;
    
    try {
        // Clear IndexedDB
        if ('indexedDB' in window) {
            console.log('📦 Clearing IndexedDB databases...');
            
            // Get all databases if supported
            if (indexedDB.databases) {
                try {
                    const databases = await indexedDB.databases();
                    for (const db of databases) {
                        if (db.name) {
                            console.log(`🗑️ Deleting IndexedDB: ${db.name}`);
                            indexedDB.deleteDatabase(db.name);
                            clearCount++;
                        }
                    }
                } catch (e) {
                    console.warn('Could not enumerate databases, trying common names...');
                }
            }
            
            // Try to delete common database names
            const commonDbNames = [
                'hotelManagementDB',
                'offlineDB', 
                'supabaseDB',
                'dexieDB',
                'HotelDB',
                'hotel_management',
                'HMS', 
                'hotel',
                'reservations'
            ];
            
            for (const dbName of commonDbNames) {
                try {
                    indexedDB.deleteDatabase(dbName);
                    console.log(`🗑️ Attempted to delete: ${dbName}`);
                    clearCount++;
                } catch (e) {
                    // Silent fail - database might not exist
                }
            }
        }

        // Clear Local Storage
        if ('localStorage' in window) {
            const itemCount = localStorage.length;
            if (itemCount > 0) {
                console.log(`🗑️ Clearing ${itemCount} localStorage items...`);
                localStorage.clear();
                clearCount += itemCount;
            }
        }

        // Clear Session Storage
        if ('sessionStorage' in window) {
            const itemCount = sessionStorage.length;
            if (itemCount > 0) {
                console.log(`🗑️ Clearing ${itemCount} sessionStorage items...`);
                sessionStorage.clear();
                clearCount += itemCount;
            }
        }

        // Clear Cache Storage
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    await caches.delete(cacheName);
                    console.log(`🗑️ Deleted cache: ${cacheName}`);
                    clearCount++;
                }
            } catch (e) {
                console.warn('Error clearing cache storage:', e);
            }
        }

        console.log(`✅ Storage cleanup complete! Cleared ${clearCount} items.`);
        console.log('🔄 Please refresh the page to continue with clean storage.');
        
        // Show a confirmation message
        if (clearCount > 0) {
            console.log('%c🎉 SUCCESS! Browser storage has been cleared.', 'color: green; font-size: 16px; font-weight: bold;');
            console.log('%cRefresh the page (F5) to reload the Hotel Management System with clean storage.', 'color: blue; font-size: 14px;');
        } else {
            console.log('%c ℹ️ No storage items found to clear.', 'color: orange; font-size: 14px;');
        }

        return { success: true, itemsCleared: clearCount };

    } catch (error) {
        console.error('❌ Error during storage cleanup:', error);
        console.log('%c⚠️ Some storage items could not be cleared. Try the manual method.', 'color: red; font-size: 14px;');
        return { success: false, error: error.message };
    }
}

// Run the cleanup
clearHotelManagementStorage().then(result => {
    if (result.success) {
        console.log(`%cStorage cleanup completed successfully! ${result.itemsCleared} items cleared.`, 'color: green; font-weight: bold;');
    } else {
        console.log(`%cStorage cleanup failed: ${result.error}`, 'color: red; font-weight: bold;');
    }
});

// Also export for manual calling
window.clearHotelManagementStorage = clearHotelManagementStorage; 