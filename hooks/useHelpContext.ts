import React from 'react';
import type { HelpContextId } from '../types';
import { useAppContextOptional } from '../contexts/AppContext';

export function useHelpContext(helpContextId: HelpContextId, active = true) {
  const app = useAppContextOptional();

  React.useEffect(() => {
    if (!app || !active) return;
    const previous = app.helpContextId;
    app.setHelpContextId(helpContextId);

    return () => {
      if (app.helpContextId === helpContextId) {
        app.setHelpContextId(previous);
      }
    };
  }, [active, app, helpContextId]);
}
