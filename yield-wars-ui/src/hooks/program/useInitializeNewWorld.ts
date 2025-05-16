import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { 
    setWorldPda, 
    setCurrencyEntity,
    setGpuEntities,
    setInitialized,
    GpuEntityDetails 
} from '@/stores/features/worldStore';
import { toast } from 'sonner';
import { initializeNewWorld, logWorldConstants } from '@/app/actions/initializeNewWorld';
import { CurrencyType } from '@/lib/constants/programEnums';

interface UseInitializeWorldResult {
    initializeWorld: () => Promise<void>;
    isLoading: boolean;
    error: Error | null;
    data: {
        worldPda: string;
        currencyEntities: {
            [key in CurrencyType]?: {
                entityPda: string;
                pricePda: string;
            };
        };
        gpuEntities?: GpuEntityDetails[];
    } | null;
}

export function useInitializeNewWorld(): UseInitializeWorldResult {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<{
        worldPda: string;
        currencyEntities: {
            [key in CurrencyType]?: {
                entityPda: string;
                pricePda: string;
            };
        };
        gpuEntities?: GpuEntityDetails[];
    } | null>(null);
    
    const dispatch = useDispatch();
    
    const initializeWorld = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Call the Server Action without params
            const result = await initializeNewWorld();
            
            // Log the constants for easy copying to consts.ts
            await logWorldConstants(result);
            
            // Update Redux store with the results
            dispatch(setWorldPda(result.worldPda));
            
            // Update each currency entity in the store
            Object.entries(result.currencyEntities).forEach(([currencyType, data]) => {
                dispatch(setCurrencyEntity({
                    currencyType: Number(currencyType) as CurrencyType,
                    entityPda: data.entityPda,
                    pricePda: data.pricePda
                }));
            });
            
            // Update GPU entities in the store if they were created
            if (result.gpuEntities && result.gpuEntities.length > 0) {
                // Add GPU type descriptions based on their order
                // Assuming the order matches GPU_TYPES in initializeNewWorld.ts
                const gpuEntitiesWithTypes = result.gpuEntities.map((gpu, index) => {
                    let type = "Unknown GPU";
                    if (index === 0) type = "Entry GPU";
                    else if (index === 1) type = "Standard GPU";
                    else if (index === 2) type = "Premium GPU";
                    
                    return {
                        ...gpu,
                        type,
                        walletComponentPda: ""
                    };
                });
                
                dispatch(setGpuEntities(gpuEntitiesWithTypes));
                console.log(`Stored ${gpuEntitiesWithTypes.length} GPU entities in Redux store`);

                setData({
                    worldPda: result.worldPda,
                    currencyEntities: result.currencyEntities,
                    gpuEntities: gpuEntitiesWithTypes
                });
            } else {
                setData({
                    worldPda: result.worldPda,
                    currencyEntities: result.currencyEntities,
                    gpuEntities: []
                });
            }
            
            dispatch(setInitialized(true));
            toast.success('World initialized successfully! Constants have been logged to the console - copy them to src/lib/consts.ts to avoid reinitializing in the future.');
            
        } catch (err) {
            const error = err as Error;
            setError(error);
            toast.error(`Failed to initialize world: ${error.message}`);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };
    
    return {
        initializeWorld,
        isLoading,
        error,
        data
    };
} 