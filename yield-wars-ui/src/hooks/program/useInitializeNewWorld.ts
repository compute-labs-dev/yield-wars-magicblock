import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { 
    setWorldPda, 
    setCurrencyEntity,
    setInitialized 
} from '@/stores/features/worldStore';
import { toast } from 'sonner';
import { initializeNewWorld } from '@/app/actions/initializeNewWorld';
import { CurrencyType } from '@/lib/constants/programEnums';

interface InitializeWorldParams {
    userPublicKey: string;
}

interface UseInitializeWorldResult {
    initializeWorld: (params: InitializeWorldParams) => Promise<void>;
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
    } | null>(null);
    
    const dispatch = useDispatch();
    
    const initializeWorld = async (params: InitializeWorldParams) => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Call the Server Action directly
            const result = await initializeNewWorld(params);
            
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
            
            dispatch(setInitialized(true));
            
            setData(result);
            toast.success('World initialized successfully!');
            
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