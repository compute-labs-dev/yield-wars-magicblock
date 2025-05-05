'use client';

import { UserCircle } from "lucide-react";
import { useDispatch } from "react-redux";
import { toggleProfileContainerVisible } from "@/stores/features/uiSlice";

export default function ProfileIcon() {
    const dispatch = useDispatch();

    return (
        <button 
            onClick={() => dispatch(toggleProfileContainerVisible())}
            className="flex items-center justify-center"
        >
            <UserCircle className="w-6 h-6 text-green-500 cursor-pointer" />
        </button>
    );
} 