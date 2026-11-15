import { useEffect, useState, useSyncExternalStore } from 'react';

const layerStack: number[] = [];
let nextLayerId = 1;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const getTopLayer = () => layerStack[layerStack.length - 1] ?? null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useModalLayerTop() {
  return useSyncExternalStore(subscribe, getTopLayer, getTopLayer);
}

export function useModalLayer(visible: boolean): number {
  const [layerId] = useState(() => {
    const id = nextLayerId;
    nextLayerId += 1;
    return id;
  });

  useEffect(() => {
    if (!visible) return;
    layerStack.push(layerId);
    emit();
    return () => {
      const index = layerStack.indexOf(layerId);
      if (index !== -1) layerStack.splice(index, 1);
      emit();
    };
  }, [visible, layerId]);

  return layerId;
}
