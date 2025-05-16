'use client';

import { usePrivy } from '@privy-io/react-auth'
import { Button } from '../ui/Button';
import ProfileContainer from './ProfileContainer';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/stores/store';
import { toggleLoginVisible } from '@/stores/features/uiSlice';
import { UserCircle } from 'lucide-react';
export function PrivyLogin(
    {
        appearDelay = 0
    }: {
        appearDelay?: number
    }
) {
    const { ready, authenticated, login, user: privyUser } = usePrivy();
    const isVisible = useSelector((state: RootState) => state.ui.isLoginVisible);

    const dispatch = useDispatch();
    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(toggleLoginVisible());
        }, appearDelay);

        return () => clearTimeout(timer);
    }, [appearDelay, dispatch]);


    if (!authenticated || !ready || !isVisible) {
        return (
            <button 
            onClick={() => login()}
            className="flex items-center justify-center"
        >
            <UserCircle className="w-6 h-6 text-white cursor-pointer" />
        </button>
        )
    }

    if (authenticated && privyUser) {
        return (
            <ProfileContainer />
        )
    }

    // Fallback state - shouldn't normally reach here
    return (
        <Button
            onClick={login}
            className="button-hover hidden md:flex cursor-pointer text-md m-0 px-2 text-lg font-bold"
            variant="link"
        >
            Reconnect
        </Button>
    );
}
