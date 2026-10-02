import React, { useEffect, useState, useRef } from 'react';

export function FlashingPrice({ 
  price, 
  className = "" 
}: { 
  price: number;
  className?: string;
}) {
  const [flashClass, setFlashClass] = useState("");
  const prevPrice = useRef(price);

  useEffect(() => {
    if (price > prevPrice.current) {
      setFlashClass("text-emerald-400 bg-emerald-400/10 transition-none");
    } else if (price < prevPrice.current) {
      setFlashClass("text-rose-400 bg-rose-400/10 transition-none");
    }
    
    prevPrice.current = price;

    const timer = setTimeout(() => {
      setFlashClass("transition-all duration-1000 bg-transparent");
    }, 300);

    return () => clearTimeout(timer);
  }, [price]);

  return (
    <span className={`px-1 rounded ${flashClass} ${className}`}>
      ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
    </span>
  );
}
