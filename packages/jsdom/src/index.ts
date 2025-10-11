if (typeof (globalThis as Record<string, unknown>).DOMFormData === "undefined") {
  class DOMFormData {}
  (globalThis as Record<string, unknown>).DOMFormData = DOMFormData;
}

if (typeof (globalThis as Record<string, unknown>).DOMException === "undefined") {
  class DOMException extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "DOMException";
    }
  }

  (globalThis as Record<string, unknown>).DOMException = DOMException;
}

export class JSDOM {
  private readonly html: string;

  constructor(html: string = "", _options: Record<string, unknown> = {}) {
    this.html = html;
  }

  get window(): WindowLike {
    const document: DocumentLike = {
      body: { innerHTML: this.html },
      createElement: (tag: string) => ({ tagName: tag.toUpperCase() })
    };

    class FormDataStub {
      append(_name: string, _value: unknown): void {}
    }

    return {
      document,
      navigator: { userAgent: "jsdom-stub" },
      requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0),
      FormData: FormDataStub
    };
  }
}

type FrameRequestCallback = (time: number) => void;

interface DocumentLike {
  readonly body: { innerHTML: string };
  createElement(tag: string): { readonly tagName: string };
}

interface WindowLike {
  readonly document: DocumentLike;
  readonly navigator: { readonly userAgent: string };
  requestAnimationFrame(callback: FrameRequestCallback): unknown;
  readonly FormData: new () => void;
}

export default {
  JSDOM
};
