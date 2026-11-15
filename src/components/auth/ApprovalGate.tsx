'use client';

import React from 'react';

interface ApprovalGateProps {
  children: React.ReactNode;
}

export function ApprovalGate({ children }: ApprovalGateProps) {
  // Admin gating disabled per user request until core tool is complete
  return <>{children}</>;
}
