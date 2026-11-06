import React from 'react';
import { LivePreviewPanel } from '../../components/Preview/LivePreviewPanel';

export const PreviewPage: React.FC = () => {
  return (
    <div className="h-full w-full overflow-hidden">
      <LivePreviewPanel />
    </div>
  );
};
