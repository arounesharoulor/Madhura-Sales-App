import { useEffect } from 'react';
import { connectSocket } from '../utils/socket';

/**
 * useSocketRefresh
 * Attaches socket listeners to the given events and calls `onRefresh` whenever
 * any of them fire. Automatically cleans up on unmount.
 *
 * @param {Function} onRefresh  - function to call when an event fires
 * @param {string[]} events     - socket event names to listen on
 * @param {any[]}    deps       - extra useEffect dependencies (usually [onRefresh])
 */
export function useSocketRefresh(onRefresh, events = [], deps = []) {
  useEffect(() => {
    let mounted = true;
    let socketCleanup = null;

    const setup = async () => {
      const sock = await connectSocket();
      if (!sock || !mounted) return;

      const handler = () => { if (mounted) onRefresh(); };
      events.forEach(ev => sock.on(ev, handler));

      socketCleanup = () => events.forEach(ev => sock.off(ev, handler));
    };

    setup();

    return () => {
      mounted = false;
      if (socketCleanup) socketCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
