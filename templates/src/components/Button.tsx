import React from "react";

export default function Button({ children }: { children?: React.ReactNode }) {
    return (
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            {children}
        </button>
    );
}
