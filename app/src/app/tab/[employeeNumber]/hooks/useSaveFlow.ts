import { useState, useRef, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Employee, ScannedProduct } from '../types';

const INACTIVITY_TIMEOUT_MS = 15000;

interface Params {
  employee: Employee | null;
  employeeNumber: string;
  pendingTotal: number;
  scannedProducts: ScannedProduct[];
  setLoading: Dispatch<SetStateAction<boolean>>;
  router: { push: (url: string) => void };
  resetOpen: boolean;
  unknownOpen: boolean;
  editProduct: ScannedProduct | null;
}

export function useSaveFlow({
  employee,
  employeeNumber,
  pendingTotal,
  scannedProducts,
  setLoading,
  router,
  resetOpen,
  unknownOpen,
  editProduct,
}: Params) {
  console.log('[useSaveFlow] render', { scannedProducts: scannedProducts.length, saveOpen: undefined, resetOpen, unknownOpen, editProduct: !!editProduct });
  const [saveOpen, setSaveOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const handleSaveRef = useRef<() => void>(() => {});

  const doSave = useCallback(async () => {
    if (!employee || pendingTotal === 0) return;

    setLoading(true);
    const res = await fetch('/api/employees/tab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeNumber, amount: pendingTotal }),
    });

    if (res.ok && scannedProducts.length > 0) {
      await fetch('/api/products/decrement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: scannedProducts.map((p) => ({
            barcode: p.barcode,
            quantity: p.qty,
          })),
        }),
      });

      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNumber,
          totalAmount: pendingTotal,
          items: scannedProducts.map((p) => ({
            barcode: p.barcode,
            name: p.name,
            price: p.price,
            quantity: p.qty,
          })),
        }),
      }).catch(console.error);
    }

    if (res.ok) router.push('/');
    setLoading(false);
  }, [employee, employeeNumber, pendingTotal, scannedProducts, setLoading, router]);

  const cancelSave = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSaveOpen(false);
    setCountdown(5);
  }, []);

  const startSaveCountdown = useCallback(() => {
    setCountdown(5);
    setSaveOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!employee) return;
    if (pendingTotal === 0) {
      router.push('/');
      return;
    }
    startSaveCountdown();
  }, [employee, pendingTotal, router, startSaveCountdown]);

  // Keep refs current so effects always call the latest versions
  doSaveRef.current = doSave;
  handleSaveRef.current = handleSave;

  // Start countdown interval when save modal opens
  useEffect(() => {
    if (!saveOpen) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [saveOpen]);

  // Trigger save when countdown reaches 0
  useEffect(() => {
    if (countdown <= 0 && saveOpen) {
      cancelSave();
      doSaveRef.current();
    }
  }, [countdown, saveOpen, cancelSave]);

  // Auto-save after 15 s of no new scan; paused while any modal is open
  useEffect(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    if (saveOpen || resetOpen || unknownOpen || editProduct) {
      console.log('[inactivity] timer paused — modal open');
      return;
    }

    console.log('[inactivity] timer started (15 s)');
    inactivityTimerRef.current = setTimeout(() => {
      console.log('[inactivity] fired — calling handleSave');
      handleSaveRef.current();
    }, INACTIVITY_TIMEOUT_MS);

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [scannedProducts, saveOpen, resetOpen, unknownOpen, editProduct]);

  return { saveOpen, countdown, handleSave, cancelSave, doSave };
}
