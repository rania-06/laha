import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isArabic =
      typeof document !== 'undefined' && document.documentElement.lang === 'ar';

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4 py-12 dark:bg-black">
        <div className="w-full max-w-md rounded-3xl border border-[#d2d2d7] bg-white p-8 text-center dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {isArabic
              ? 'حدث خطأ غير متوقع في التطبيق'
              : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
            {isArabic
              ? 'تعذّر إكمال العملية الحالية. يمكنك إعادة تحميل الصفحة للمتابعة بأمان.'
              : 'We ran into an unexpected problem. Reload the page to continue safely.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>{isArabic ? 'إعادة تحميل الصفحة' : 'Reload page'}</span>
          </button>
        </div>
      </div>
    );
  }
}
