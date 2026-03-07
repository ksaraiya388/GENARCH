"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GraphErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 rounded-lg border border-white/[0.08] bg-navy-mid p-8 text-center">
          <p className="text-surface-white font-medium">
            The knowledge graph could not be loaded.
          </p>
          <p className="text-sm text-cool-light max-w-md">
            Try refreshing the page. If the problem continues, use the Atlas and
            Mechanism Briefs to explore the same data.
          </p>
          <button
            type="button"
            onClick={() => typeof window !== "undefined" && window.location.reload()}
            className="mt-2 rounded-md bg-teal-primary px-4 py-2 text-sm font-medium text-navy-deep hover:bg-teal-soft focus:outline-none focus:ring-2 focus:ring-teal-soft"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
