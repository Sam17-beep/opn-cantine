import { useState, useRef, useCallback } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { ScannedProduct } from '../types';
import { getCachedProduct, putCachedProduct } from '@/lib/infrastructure/offline/lookupCache';

const RAPID_INPUT_THRESHOLD_MS = 80;
const AUTO_SUBMIT_DELAY_MS = 300;
const MIN_BARCODE_LENGTH = 4;

export function useCart(setUnknownOpen: (open: boolean) => void) {
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [scanFeedback, setScanFeedback] = useState('');
  const [scanValue, setScanValue] = useState('');

  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastScanKeystrokeRef = useRef(0);
  const rapidScanCountRef = useRef(0);
  const autoScanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAddRef = useRef(0);

  const addProductToCart = useCallback((value: string, name: string, price: number, suffix: string) => {
    setPendingTotal((prev) => prev + price);
    setScannedProducts((prev) => {
      const existing = prev.find((p) => p.barcode === value);
      if (existing) {
        return prev.map((p) =>
          p.barcode === value ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { barcode: value, name, price, qty: 1 }];
    });

    setScanFeedback(`${name} — ${price.toFixed(2)}$${suffix}`);
    setTimeout(() => setScanFeedback(''), 3000);
  }, []);

  const handleProductScan = useCallback(
    async (barcode: string) => {
      const value = barcode.trim();
      if (!value || value.length < MIN_BARCODE_LENGTH) return;

      try {
        const res = await fetch(
          `/api/products/lookup?barcode=${encodeURIComponent(value)}`
        );
        const data = await res.json();

        if (!data.found) {
          setUnknownOpen(true);
          return;
        }

        const product = data.product;

        if (product.quantity <= 0) {
          setScanFeedback(`${product.name} — Rupture de stock`);
          setTimeout(() => setScanFeedback(''), 3000);
          return;
        }

        await putCachedProduct(product);
        addProductToCart(value, product.name, product.price, '');
      } catch {
        // Network failure — fall back to whatever this kiosk has scanned before. The
        // cached stock count isn't trustworthy offline, so the "Rupture de stock" check
        // is skipped here; a sale built on stale stock data still goes through, and
        // resolves itself on the server when the sale syncs (see saleQueue/commitSale).
        const cached = await getCachedProduct(value);
        if (cached) {
          addProductToCart(value, cached.name, cached.price, ' (hors ligne)');
        } else {
          setScanFeedback('Hors ligne — produit inconnu localement');
          setTimeout(() => setScanFeedback(''), 3000);
        }
      }

      setScanValue('');
    },
    [setUnknownOpen, addProductToCart]
  );

  const addCoffee = () => {
    const now = Date.now();
    if (now - lastAddRef.current < 300) return;
    lastAddRef.current = now;

    setPendingTotal((prev) => prev + 1);
    setScannedProducts((prev) => {
      const existing = prev.find((p) => p.barcode === '_cafe_');
      if (existing) {
        return prev.map((p) =>
          p.barcode === '_cafe_' ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { barcode: '_cafe_', name: 'Café', price: 1.0, qty: 1 }];
    });
  };

  const addEvent = (name: string, price: number) => {
    const now = Date.now();
    if (now - lastAddRef.current < 300) return;
    lastAddRef.current = now;

    setPendingTotal((prev) => prev + price);
    setScannedProducts((prev) => {
      const existing = prev.find((p) => p.barcode === '_event_');
      if (existing) {
        return prev.map((p) =>
          p.barcode === '_event_' ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { barcode: '_event_', name, price, qty: 1 }];
    });
  };

  const handleScanChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setScanValue(val);

    const now = Date.now();
    if (now - lastScanKeystrokeRef.current < RAPID_INPUT_THRESHOLD_MS) {
      rapidScanCountRef.current++;
    } else {
      rapidScanCountRef.current = 1;
    }
    lastScanKeystrokeRef.current = now;

    if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current);

    if (rapidScanCountRef.current >= 3 && val.length >= MIN_BARCODE_LENGTH) {
      autoScanTimerRef.current = setTimeout(() => {
        handleProductScan(val);
      }, AUTO_SUBMIT_DELAY_MS);
    }
  };

  const handleScanKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current);
      handleProductScan(scanValue);
    }
  };

  return {
    scannedProducts,
    setScannedProducts,
    pendingTotal,
    setPendingTotal,
    scanFeedback,
    scanValue,
    scanInputRef,
    addCoffee,
    addEvent,
    handleScanChange,
    handleScanKeyDown,
  };
}
