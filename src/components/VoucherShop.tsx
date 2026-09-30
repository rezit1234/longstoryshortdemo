"use client";

import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  AMOUNT_VOUCHERS,
  EXPERIENCE_VOUCHERS,
  formatCzk,
  resolveAmountCheckoutPreview,
  type AmountPreviewSettings,
  type AmountVoucher,
  type ExperienceGalleryImage,
  type ExperienceVoucher,
} from "@/data/vouchers";
import {
  DEFAULT_PICKUP_FEE,
  DEFAULT_POST_SHIPPING_FEE,
  DEFAULT_POST_SHIPPING_FEE_SK,
  type AdminVoucherSettings,
  type ShopId,
} from "@/data/admin-voucher-settings";
import { getShopBrand } from "@/data/shops";
import { setBlobOrigin } from "@/lib/blobOrigin";
import {
  settingsToAmountVouchers,
  settingsToExperienceVouchers,
} from "@/lib/voucher-settings";

type DeliveryFees = {
  pickupFee: number;
  postShippingFee: number;
  postShippingFeeSk: number;
};

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="18"
      height="18"
      aria-hidden
    >
      <path d="M104,216a16,16,0,1,1-16-16A16,16,0,0,1,104,216Zm88-16a16,16,0,1,0,16,16A16,16,0,0,0,192,200ZM239.71,74.14l-25.64,92.28A24.06,24.06,0,0,1,191,184H92.16A24.06,24.06,0,0,1,69,166.42L33.92,40H16a8,8,0,0,1,0-16H40a8,8,0,0,1,7.71,5.86L57.19,64H232a8,8,0,0,1,7.71,10.14ZM221.47,80H61.64l22.81,82.14A8,8,0,0,0,92.16,168H191a8,8,0,0,0,7.71-5.86Z" />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="24"
      height="24"
      aria-hidden
    >
      <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Zm-16-24a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h32A8,8,0,0,1,208,168Zm-64,0a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Z" />
    </svg>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="20"
      height="20"
      aria-hidden
    >
      <path d="M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="20"
      height="20"
      aria-hidden
    >
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="18"
      height="18"
      aria-hidden
    >
      <path d="M128,24a104,104,0,0,0,0,208c21.51,0,44.1-6.48,60.43-17.33a8,8,0,0,0-8.86-13.33C166,210.38,146.21,216,128,216a88,88,0,1,1,88-88c0,26.45-10.88,32-20,32s-20-5.55-20-32V88a8,8,0,0,0-16,0v4.26a48,48,0,1,0,5.93,65.1c6,12,16.35,18.64,30.07,18.64,22.54,0,36-17.94,36-48A104.11,104.11,0,0,0,128,24Zm0,136a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
    </svg>
  );
}

function PostIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="18"
      height="18"
      aria-hidden
    >
      <path d="M246,106.65,212.33,69.3A16,16,0,0,0,200.44,64H136V32a8,8,0,0,0-16,0V64H40A16,16,0,0,0,24,80v64a16,16,0,0,0,16,16h80v64a8,8,0,0,0,16,0V160h64.44a16,16,0,0,0,11.89-5.3L246,117.35A8,8,0,0,0,246,106.65ZM200.44,144H40V80H200.44l28.8,32Z" />
    </svg>
  );
}

function PickupIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="18"
      height="18"
      aria-hidden
    >
      <path d="M230.33,141.06a24.4,24.4,0,0,0-21.24-4.23l-41.84,9.62A28,28,0,0,0,140,112H89.94a31.82,31.82,0,0,0-22.63,9.37L44.69,144H16A16,16,0,0,0,0,160v40a16,16,0,0,0,16,16H120a7.93,7.93,0,0,0,1.94-.24l64-16a6.94,6.94,0,0,0,1.19-.4L226,182.82l.44-.2a24.6,24.6,0,0,0,3.93-41.56ZM16,160H40v40H16Zm203.43,8.21-38,16.18L119,200H56V155.31l22.63-22.62A15.86,15.86,0,0,1,89.94,128H140a12,12,0,0,1,0,24H112a8,8,0,0,0,0,16h32a8.32,8.32,0,0,0,1.79-.2l67-15.41.31-.08a8.6,8.6,0,0,1,6.3,15.9ZM154.34,77.66a8,8,0,0,1,11.32-11.32L184,84.69V24a8,8,0,0,1,16,0V84.69l18.34-18.35a8,8,0,0,1,11.32,11.32l-32,32a8,8,0,0,1-11.32,0Z" />
    </svg>
  );
}

type CheckoutSelectOption = {
  value: string;
  label: string;
};

function CheckoutSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: CheckoutSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      className={open ? "checkout-select is-open" : "checkout-select"}
      ref={rootRef}
    >
      <button
        type="button"
        className="checkout-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label}</span>
        <ChevronIcon className="checkout-select-chevron" />
      </button>

      {open ? (
        <ul className="checkout-select-menu" id={listboxId} role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={
                  option.value === value
                    ? "checkout-select-option is-selected"
                    : "checkout-select-option"
                }
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function QuantityStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  function clamp(next: number) {
    return Math.min(max, Math.max(min, next));
  }

  function setFromInput(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      onChange(min);
      return;
    }
    onChange(clamp(Number(digits)));
  }

  return (
    <div className="checkout-quantity">
      <input
        type="text"
        inputMode="numeric"
        className="checkout-quantity-input"
        aria-label="Množství"
        value={String(value)}
        onChange={(event) => setFromInput(event.target.value)}
        onBlur={() => onChange(clamp(value || min))}
      />
      <div className="checkout-quantity-actions">
        <button
          type="button"
          className="checkout-quantity-btn"
          aria-label="Snížit množství"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
        >
          <QuantityMinusIcon />
        </button>
        <button
          type="button"
          className="checkout-quantity-btn"
          aria-label="Zvýšit množství"
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
        >
          <QuantityPlusIcon />
        </button>
      </div>
    </div>
  );
}

function QuantityMinusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden
    >
      <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z" />
    </svg>
  );
}

function QuantityPlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden
    >
      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="16"
      height="16"
      aria-hidden
    >
      <path d="M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="16"
      height="16"
      aria-hidden
    >
      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinejoin="round"
      width="16"
      height="16"
      aria-hidden
    >
      <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" />
    </svg>
  );
}

type ShopTab = "amount" | "experience";

type CheckoutItem =
  | {
      kind: "amount";
      amount: number;
      preview: ExperienceGalleryImage;
    }
  | {
      kind: "experience";
      id: string;
      title: string;
      subtitle?: string;
      price: number;
      checkoutPreview: ExperienceGalleryImage[];
    };

type CheckoutRecipient = "other" | "self";
type CheckoutDelivery = "email" | "post" | "pickup";
type CheckoutInvoiceRecipientType = "company" | "person";

type CheckoutFormState = {
  recipient: CheckoutRecipient;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  recipientName: string;
  message: string;
  phone: string;
  delivery: CheckoutDelivery;
  deliveryEmail: string;
  wantInvoice: boolean;
  invoiceRecipientType: CheckoutInvoiceRecipientType | null;
  companyId: string;
  vatId: string;
  invoiceEmail: string;
  invoiceFirstName: string;
  invoiceLastName: string;
  invoiceAddressLine1: string;
  invoiceCity: string;
  invoicePostalCode: string;
  invoiceNote: string;
  shippingName: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
};

const QUANTITY_MIN = 1;
const QUANTITY_MAX = 15;
const INVOICE_REQUIRED_FROM_CZK = 10000;

const DEFAULT_DELIVERY_FEES: DeliveryFees = {
  pickupFee: DEFAULT_PICKUP_FEE,
  postShippingFee: DEFAULT_POST_SHIPPING_FEE,
  postShippingFeeSk: DEFAULT_POST_SHIPPING_FEE_SK,
};

const EMPTY_CHECKOUT_FORM: CheckoutFormState = {
  recipient: "other",
  quantity: 1,
  buyerName: "",
  buyerEmail: "",
  recipientName: "",
  message: "",
  phone: "",
  delivery: "email",
  deliveryEmail: "",
  wantInvoice: false,
  invoiceRecipientType: null,
  companyId: "",
  vatId: "",
  invoiceEmail: "",
  invoiceFirstName: "",
  invoiceLastName: "",
  invoiceAddressLine1: "",
  invoiceCity: "",
  invoicePostalCode: "",
  invoiceNote: "",
  shippingName: "",
  addressLine1: "",
  city: "",
  postalCode: "",
  country: "CZ",
};

type CheckoutHeroImage = {
  src: string;
  alt: string;
};

type CheckoutHero =
  | { mode: "single"; image: CheckoutHeroImage }
  | { mode: "split"; left: CheckoutHeroImage; right: CheckoutHeroImage };

const EATERY_HERO: CheckoutHeroImage = {
  src: "/eatery-bakery.webp",
  alt: "Dárkový poukaz Eatery Bakery",
};

const HOSTEL_HERO: CheckoutHeroImage = {
  src: "/hostel.webp",
  alt: "Dárkový poukaz Hostel",
};

const ROOM_ID_MARKERS = [
  "the-arc",
  "the-nook",
  "the-big-one",
  "the-flat",
] as const;

function experienceHasRoom(id: string) {
  const normalized = id.toLowerCase();
  return ROOM_ID_MARKERS.some((marker) => normalized.includes(marker));
}

function experienceHasChefsTable(id: string) {
  return id.toLowerCase().includes("chefs-table");
}

function getCheckoutHero(item: CheckoutItem): CheckoutHero {
  if (item.kind === "amount") {
    return {
      mode: "single",
      image: { src: item.preview.src, alt: item.preview.alt },
    };
  }

  const preview = item.checkoutPreview.filter((image) => image.src);
  if (preview.length >= 2) {
    return {
      mode: "split",
      left: { src: preview[0].src, alt: preview[0].alt },
      right: { src: preview[1].src, alt: preview[1].alt },
    };
  }
  if (preview.length === 1) {
    return {
      mode: "single",
      image: { src: preview[0].src, alt: preview[0].alt },
    };
  }

  const hasRoom = experienceHasRoom(item.id);
  const hasChefs = experienceHasChefsTable(item.id);

  if (hasRoom && hasChefs) {
    return { mode: "split", left: EATERY_HERO, right: HOSTEL_HERO };
  }

  if (hasChefs) {
    return { mode: "single", image: EATERY_HERO };
  }

  return { mode: "single", image: HOSTEL_HERO };
}

function GalleryNavIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden
    >
      {direction === "prev" ? (
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z" />
      ) : (
        <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
      )}
    </svg>
  );
}

function isLogoImage(src: string) {
  return src.includes("logo.png");
}

function useMaxWidth(maxWidth: number) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = () => setMatches(media.matches);

    onChange();
    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, [maxWidth]);

  return matches;
}

function GalleryThumbImage({
  src,
  alt,
  isLogo,
}: {
  src: string;
  alt: string;
  isLogo: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={
        isLogo ? "experience-gallery-image is-logo" : "experience-gallery-image"
      }
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}

function LightboxSlideImage({
  src,
  alt,
  isLogo,
}: {
  src: string;
  alt: string;
  isLogo: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={
        isLogo ? "gallery-lightbox-image is-logo" : "gallery-lightbox-image"
      }
      draggable={false}
      decoding="async"
      loading="eager"
    />
  );
}

function ExperienceGallery({ images: allImages }: { images: ExperienceGalleryImage[] }) {
  const isMobileGallery = useMaxWidth(519);
  const images = allImages.slice(0, 3);

  const loopSlides =
    images.length > 1
      ? [images[images.length - 1], ...images, images[0]]
      : images;

  const [isOpen, setIsOpen] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [instant, setInstant] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isPositioned, setIsPositioned] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportWidthRef = useRef(0);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const dragOffsetRef = useRef(0);
  const trackIndexRef = useRef(trackIndex);
  const instantRef = useRef(false);
  const isNormalizingRef = useRef(false);

  trackIndexRef.current = trackIndex;

  const syncViewportWidth = () => {
    const width = viewportRef.current?.getBoundingClientRect().width ?? 0;
    viewportWidthRef.current = width;
    setViewportWidth(width);
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
      return;
    }

    if (!viewportRef.current) return;

    syncViewportWidth();
    setIsPositioned(true);
    instantRef.current = false;
    setInstant(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !viewportRef.current) return;

    const node = viewportRef.current;
    const observer = new ResizeObserver(syncViewportWidth);
    observer.observe(node);
    window.addEventListener("resize", syncViewportWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncViewportWidth);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    images.forEach((image) => {
      const preload = new window.Image();
      preload.src = image.src;
    });
  }, [isOpen, images]);

  const getRealIndex = (index: number) => {
    if (images.length <= 1) return 0;
    if (index === 0) return images.length - 1;
    if (index === loopSlides.length - 1) return 0;
    return index - 1;
  };

  const jumpWithoutTransition = (nextIndex: number) => {
    const current = trackIndexRef.current;

    if (
      images.length <= 1 ||
      isNormalizingRef.current ||
      (current !== 0 && current !== loopSlides.length - 1)
    ) {
      return;
    }

    isNormalizingRef.current = true;
    instantRef.current = true;
    setInstant(true);
    setTrackIndex(nextIndex);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        instantRef.current = false;
        setInstant(false);
        isNormalizingRef.current = false;
      });
    });
  };

  const goPrev = () => {
    if (images.length <= 1 || isNormalizingRef.current) return;
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setTrackIndex((current) => Math.max(current - 1, 0));
  };

  const goNext = () => {
    if (images.length <= 1 || isNormalizingRef.current) return;
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setTrackIndex((current) =>
      Math.min(current + 1, loopSlides.length - 1),
    );
  };

  const goToSlide = (index: number) => {
    if (images.length <= 1 || isNormalizingRef.current) return;
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setTrackIndex(index + 1);
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (images.length <= 1) return;

      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, images.length]);

  useEffect(() => {
    if (!isOpen || images.length <= 1 || isDragging || instant) return;
    if (trackIndex !== 0 && trackIndex !== loopSlides.length - 1) return;

    const timer = window.setTimeout(() => {
      if (instantRef.current || isNormalizingRef.current) return;

      const index = trackIndexRef.current;

      if (index === loopSlides.length - 1) {
        jumpWithoutTransition(1);
      } else if (index === 0) {
        jumpWithoutTransition(images.length);
      }
    }, 420);

    return () => window.clearTimeout(timer);
  }, [trackIndex, isOpen, isDragging, instant, images.length, loopSlides.length]);

  const handleTransitionEnd = (
    event: React.TransitionEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    if (instantRef.current || isDragging || images.length <= 1) return;

    const index = trackIndexRef.current;

    if (index === loopSlides.length - 1) {
      jumpWithoutTransition(1);
    } else if (index === 0) {
      jumpWithoutTransition(images.length);
    }
  };

  const finishDrag = () => {
    if (!isDragging) return;

    const width = viewportWidthRef.current;
    const offset = dragOffsetRef.current;
    const threshold = width * 0.18;

    setIsDragging(false);

    if (images.length > 1) {
      if (offset > threshold) goPrev();
      else if (offset < -threshold) goNext();
      else setDragOffset(0);
    } else {
      setDragOffset(0);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (images.length <= 1 || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartX.current = event.clientX;
    dragStartOffset.current = dragOffset;
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const nextOffset =
      dragStartOffset.current + (event.clientX - dragStartX.current);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishDrag();
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);
    setDragOffset(0);
    dragOffsetRef.current = 0;
  };

  const openLightbox = (index: number) => {
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setIsDragging(false);
    isNormalizingRef.current = false;
    setIsPositioned(false);
    instantRef.current = true;
    setInstant(true);
    setTrackIndex(images.length > 1 ? index + 1 : 0);
    setIsOpen(true);
  };

  const closeLightbox = () => {
    setIsOpen(false);
    setIsPositioned(false);
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setIsDragging(false);
    setInstant(false);
    instantRef.current = false;
    isNormalizingRef.current = false;
  };

  const realIndex = getRealIndex(trackIndex);
  const trackOffset =
    viewportWidth > 0 ? -(trackIndex * viewportWidth) + dragOffset : dragOffset;

  return (
    <>
      <div className="experience-gallery">
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            type="button"
            className="experience-gallery-thumb"
            onClick={() => openLightbox(index)}
            aria-label={`Zobrazit fotografii ${index + 1}`}
          >
            <GalleryThumbImage
              src={image.src}
              alt={image.alt}
              isLogo={isLogoImage(image.src)}
            />
          </button>
        ))}
      </div>

      {isOpen ? (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Fotografie na celou obrazovku"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="gallery-lightbox-close"
            aria-label="Zavřít"
            onClick={(event) => {
              event.stopPropagation();
              closeLightbox();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              fill="currentColor"
              width="28"
              height="28"
              aria-hidden
            >
              <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
            </svg>
          </button>

          {images.length > 1 ? (
            <button
              type="button"
              className="gallery-lightbox-nav is-prev"
              aria-label="Předchozí fotografie"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
            >
              <GalleryNavIcon direction="prev" />
            </button>
          ) : null}

          <div
            className="gallery-lightbox-stage"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              ref={viewportRef}
              className={
                isDragging
                  ? "gallery-lightbox-viewport is-dragging"
                  : isPositioned
                    ? "gallery-lightbox-viewport"
                    : "gallery-lightbox-viewport is-measuring"
              }
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <div
                className="gallery-lightbox-track"
                style={{
                  transform: `translate3d(${trackOffset}px, 0, 0)`,
                  transition:
                    isDragging || instant || !isPositioned
                      ? "none"
                      : "transform 380ms cubic-bezier(0.33, 0, 0.2, 1)",
                }}
                onTransitionEnd={handleTransitionEnd}
              >
                {loopSlides.map((image, index) => {
                  const slideRealIndex = getRealIndex(index);

                  return (
                    <div
                      key={
                        index === 0
                          ? `clone-prev-${image.src}`
                          : index === loopSlides.length - 1
                            ? `clone-next-${image.src}`
                            : `${image.src}-${slideRealIndex}-slide`
                      }
                      className="gallery-lightbox-slide"
                      aria-hidden={slideRealIndex !== realIndex}
                      style={
                        viewportWidth > 0
                          ? {
                              flex: `0 0 ${viewportWidth}px`,
                              width: viewportWidth,
                            }
                          : undefined
                      }
                    >
                      <LightboxSlideImage
                        src={image.src}
                        alt={image.alt}
                        isLogo={isLogoImage(image.src)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {images.length > 1 ? (
              <div
                className="gallery-lightbox-counter"
                aria-live="polite"
                aria-atomic="true"
              >
                {realIndex + 1} / {images.length}
              </div>
            ) : null}
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              className="gallery-lightbox-nav is-next"
              aria-label="Další fotografie"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
            >
              <GalleryNavIcon direction="next" />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function VoucherShop({ shopId = "lss" }: { shopId?: ShopId } = {}) {
  const brand = getShopBrand(shopId);
  const [tab, setTab] = useState<ShopTab>(
    shopId === "lss" ? "experience" : "amount",
  );
  const [amountVouchers, setAmountVouchers] = useState<AmountVoucher[]>(
    shopId === "lss" ? AMOUNT_VOUCHERS : [],
  );
  const [amountPreviews, setAmountPreviews] = useState<AmountPreviewSettings | null>(
    null,
  );
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFees>(DEFAULT_DELIVERY_FEES);
  const [experienceVouchers, setExperienceVouchers] = useState<ExperienceVoucher[]>(
    shopId === "lss" ? EXPERIENCE_VOUCHERS : [],
  );
  const [selectedAmount, setSelectedAmount] = useState(
    shopId === "lss" ? (AMOUNT_VOUCHERS[0]?.amount ?? 1000) : 1000,
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const shopRef = useRef<HTMLDivElement>(null);

  const hasExperiences = experienceVouchers.length > 0;
  const hasAmounts = amountVouchers.length > 0;
  const showTypeTabs = hasExperiences && hasAmounts;
  const activeTab: ShopTab = showTypeTabs
    ? tab
    : hasExperiences
      ? "experience"
      : "amount";

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch(
          `/api/voucher-settings?shop=${encodeURIComponent(shopId)}`,
        );
        const data = (await response.json().catch(() => null)) as {
          settings?: AdminVoucherSettings;
        } | null;
        if (!response.ok || !data?.settings || cancelled) return;

        const nextAmounts = settingsToAmountVouchers(data.settings);
        const nextExperiences = settingsToExperienceVouchers(data.settings);
        setAmountVouchers(nextAmounts);
        setAmountPreviews(data.settings.amountPreviews);
        setDeliveryFees({
          pickupFee: data.settings.pickupFee,
          postShippingFee: data.settings.postShippingFee,
          postShippingFeeSk: data.settings.postShippingFeeSk,
        });
        setExperienceVouchers(nextExperiences);
        setTab(nextExperiences.length > 0 ? "experience" : "amount");
        setSelectedAmount((current) => {
          if (nextAmounts.some((voucher) => voucher.amount === current)) {
            return current;
          }
          return nextAmounts[0]?.amount ?? 1000;
        });
      } catch {
        // Keep hardcoded fallback.
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  useEffect(() => {
    if (!checkoutItem) return;
    shopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [checkoutItem]);

  const shopIntro = showTypeTabs
    ? "Vyberte poukaz na konkrétní zážitek, nebo na částku."
    : hasExperiences
      ? "Vyberte poukaz na konkrétní zážitek."
      : "Vyberte hodnotu dárkového poukazu.";

  return (
    <div className="voucher-shop" ref={shopRef}>
      <div className="shop-box">
        {checkoutItem && !brand.keepShopBannerInCheckout ? (
          <CheckoutHeroSection
            item={checkoutItem}
            onBack={() => setCheckoutItem(null)}
          />
        ) : (
          <section
            className={checkoutItem ? "shop-hero is-checkout" : "shop-hero"}
            aria-label={`Dárkové poukazy ${brand.brandName}`}
          >
            <div className="shop-hero-media">
              <Image
                src={brand.bannerSrc}
                alt={brand.bannerAlt}
                fill
                priority
                sizes="(max-width: 720px) 100vw, 720px"
                className="shop-hero-image"
                draggable={false}
              />
            </div>
            {checkoutItem ? (
              <button
                type="button"
                className="checkout-back"
                onClick={() => setCheckoutItem(null)}
              >
                <ChevronLeftIcon className="checkout-back-icon" />
                Zpět k výběru
              </button>
            ) : null}
          </section>
        )}

        <div className={checkoutItem ? "shop-box-body is-checkout" : "shop-box-body"}>
          {checkoutItem ? (
            <CheckoutPanel
              item={checkoutItem}
              deliveryFees={deliveryFees}
              brandName={brand.brandName}
              shopId={shopId}
            />
          ) : (
            <>
              <p className="shop-hero-brand">{brand.brandName}</p>
              <p className="shop-hero-copy">{shopIntro}</p>

              {showTypeTabs ? (
                <div
                  className={
                    activeTab === "amount"
                      ? "shop-tabs is-amount"
                      : "shop-tabs is-experience"
                  }
                  role="tablist"
                  aria-label="Typ poukazu"
                >
                  <span className="shop-tabs-indicator" aria-hidden />
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "experience"}
                    className={activeTab === "experience" ? "is-active" : undefined}
                    onClick={() => setTab("experience")}
                  >
                    Zážitky
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "amount"}
                    className={activeTab === "amount" ? "is-active" : undefined}
                    onClick={() => setTab("amount")}
                  >
                    Na částku
                  </button>
                </div>
              ) : null}

              {activeTab === "experience" && hasExperiences ? (
                <ExperiencePanel
                  vouchers={experienceVouchers}
                  openId={openId}
                  onToggle={setOpenId}
                  onBuy={(voucher) =>
                    setCheckoutItem({
                      kind: "experience",
                      id: voucher.id,
                      title: voucher.title,
                      subtitle: voucher.subtitle,
                      price: voucher.price,
                      checkoutPreview: voucher.checkoutPreview ?? [],
                    })
                  }
                />
              ) : hasAmounts ? (
                <AmountPanel
                  vouchers={amountVouchers}
                  selectedAmount={selectedAmount}
                  amountLabel={brand.amountLabel}
                  amountMarkSrc={brand.amountMarkSrc}
                  amountMarkCompact={brand.amountMarkCompact}
                  onSelect={setSelectedAmount}
                  onBuy={(amount) =>
                    setCheckoutItem({
                      kind: "amount",
                      amount,
                      preview: resolveAmountCheckoutPreview(
                        amount,
                        amountVouchers,
                        amountPreviews,
                      ),
                    })
                  }
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      <footer className="shop-payment-footer" aria-label="Platební metody">
        <div className="shop-payment-logos">
          <a
            href="https://www.comgate.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="shop-payment-logo-link"
            aria-label="Comgate - platební brána"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/comgate/comgate.svg"
              alt="Comgate"
              className="shop-payment-logo is-comgate"
              width={96}
              height={24}
            />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/comgate/visa.svg"
            alt="Visa"
            className="shop-payment-logo"
            width={72}
            height={24}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/comgate/mastercard.svg"
            alt="Mastercard"
            className="shop-payment-logo"
            width={72}
            height={24}
          />
        </div>
        <p className="shop-payment-note">
          Online platby zajišťuje platební brána{" "}
          <a
            href="https://www.comgate.eu"
            target="_blank"
            rel="noopener noreferrer"
          >
            Comgate
          </a>
          . Comgate a.s. je licencovaná platební instituce pod dohledem ČNB.
        </p>
      </footer>
    </div>
  );
}

function CheckoutHeroSection({
  item,
  onBack,
}: {
  item: CheckoutItem;
  onBack: () => void;
}) {
  const hero = getCheckoutHero(item);

  return (
    <section className="checkout-hero" aria-label="Náhled poukazu">
      {hero.mode === "single" ? (
        <div className="checkout-hero-media is-single">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.image.src}
            alt={hero.image.alt}
            className="checkout-hero-image"
            draggable={false}
          />
        </div>
      ) : (
        <div className="checkout-hero-media is-split" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.left.src}
            alt=""
            className="checkout-hero-image is-left"
            draggable={false}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.right.src}
            alt=""
            className="checkout-hero-image is-right"
            draggable={false}
          />
        </div>
      )}

      <button type="button" className="checkout-back" onClick={onBack}>
        <ChevronLeftIcon className="checkout-back-icon" />
        Zpět k výběru
      </button>
    </section>
  );
}

function CheckoutPanel({
  item,
  deliveryFees,
  brandName,
  shopId,
}: {
  item: CheckoutItem;
  deliveryFees: DeliveryFees;
  brandName: string;
  shopId: ShopId;
}) {
  const [form, setForm] = useState<CheckoutFormState>(EMPTY_CHECKOUT_FORM);
  const [touched, setTouched] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const unitPrice = item.kind === "amount" ? item.amount : item.price;
  const isSlovakia = form.country === "SK";
  const postShippingFee = isSlovakia
    ? deliveryFees.postShippingFeeSk
    : deliveryFees.postShippingFee;
  const shippingFee =
    form.delivery === "post"
      ? postShippingFee
      : form.delivery === "pickup"
        ? deliveryFees.pickupFee
        : 0;
  const itemsTotal = unitPrice * form.quantity;
  const total = itemsTotal + shippingFee;
  const invoiceRequired = itemsTotal >= INVOICE_REQUIRED_FROM_CZK;
  const title =
    item.kind === "amount"
      ? `Poukaz na částku ${formatCzk(item.amount)}`
      : item.title;
  const subtitle =
    item.kind === "experience"
      ? item.subtitle
      : `Dárkový poukaz ${brandName}`;

  useEffect(() => {
    if (!invoiceRequired) return;
    setForm((current) => {
      if (current.wantInvoice) return current;
      return {
        ...current,
        wantInvoice: true,
        invoiceEmail: current.invoiceEmail.trim() || current.buyerEmail,
      };
    });
  }, [invoiceRequired]);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const buyerEmailOk = isValidEmail(form.buyerEmail);
  const deliveryEmailOk = isValidEmail(form.deliveryEmail);
  const invoiceEmailOk = isValidEmail(form.invoiceEmail);
  const companyInvoiceOk =
    form.companyId.trim().length > 0 && invoiceEmailOk;
  const personInvoiceOk =
    form.invoiceFirstName.trim().length > 0 &&
    form.invoiceLastName.trim().length > 0 &&
    form.invoiceAddressLine1.trim().length > 0 &&
    form.invoiceCity.trim().length > 0 &&
    form.invoicePostalCode.trim().length > 0 &&
    invoiceEmailOk;
  const invoiceOk =
    !form.wantInvoice ||
    (form.invoiceRecipientType === "company"
      ? companyInvoiceOk
      : form.invoiceRecipientType === "person"
        ? personInvoiceOk
        : false);
  const recipientNameOk =
    form.recipient === "self" || form.recipientName.trim().length > 0;
  const postAddressOk =
    form.shippingName.trim().length > 0 &&
    form.addressLine1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.postalCode.trim().length > 0;
  const canPay =
    form.buyerName.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    buyerEmailOk &&
    recipientNameOk &&
    invoiceOk &&
    (form.delivery !== "email" || deliveryEmailOk) &&
    (form.delivery !== "post" || postAddressOk);

  function updateForm<K extends keyof CheckoutFormState>(
    key: K,
    value: CheckoutFormState[K],
  ) {
    setForm((current) => {
      if (key === "buyerEmail") {
        const buyerEmail = value as string;
        return {
          ...current,
          buyerEmail,
          deliveryEmail:
            current.recipient === "self" && current.delivery === "email"
              ? buyerEmail
              : current.deliveryEmail,
          invoiceEmail:
            current.wantInvoice &&
            (current.invoiceEmail === "" ||
              current.invoiceEmail === current.buyerEmail)
              ? buyerEmail
              : current.invoiceEmail,
        };
      }
      if (key === "wantInvoice") {
        const wantInvoice = value as boolean;
        if (!wantInvoice) {
          if (invoiceRequired) {
            return current;
          }
          return {
            ...current,
            wantInvoice: false,
            invoiceRecipientType: null,
          };
        }
        return {
          ...current,
          wantInvoice: true,
          invoiceEmail: current.invoiceEmail.trim() || current.buyerEmail,
        };
      }
      if (key === "delivery") {
        const delivery = value as CheckoutDelivery;
        if (delivery !== "email") {
          return { ...current, delivery, message: "" };
        }
        return {
          ...current,
          delivery,
          deliveryEmail:
            current.recipient === "self"
              ? current.buyerEmail
              : current.deliveryEmail,
        };
      }
      if (key === "recipient" && value === "self") {
        return {
          ...current,
          recipient: "self",
          recipientName: "",
          message: "",
          deliveryEmail:
            current.delivery === "email"
              ? current.buyerEmail
              : current.deliveryEmail,
        };
      }
      if (key === "recipient" && value === "other") {
        return {
          ...current,
          recipient: "other",
          deliveryEmail: current.delivery === "email" ? "" : current.deliveryEmail,
        };
      }
      return { ...current, [key]: value };
    });
  }

  function invoiceErrorMessage() {
    if (!form.wantInvoice) return null;
    if (!form.invoiceRecipientType) {
      return "Zvolte, zda má být daňový doklad na firmu, nebo na jméno.";
    }
    if (form.invoiceRecipientType === "company") {
      return "Vyplňte IČO a platný e-mail pro daňový doklad.";
    }
    return "Vyplňte jméno, příjmení, adresu, město, PSČ a e-mail pro daňový doklad.";
  }

  async function handlePay() {
    setTouched(true);
    setPayError(null);
    if (!canPay || paying) return;

    setPaying(true);
    try {
      const response = await fetch("/api/checkout/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          item:
            item.kind === "amount"
              ? { kind: "amount", amount: item.amount }
              : {
                  kind: "experience",
                  id: item.id,
                  title: item.title,
                  subtitle: item.subtitle,
                  price: item.price,
                },
          form,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        redirectUrl?: string;
      };

      if (!response.ok || !data.redirectUrl) {
        throw new Error(data.error || "Platbu se nepodařilo založit.");
      }

      window.location.assign(data.redirectUrl);
    } catch (error) {
      setPayError(
        error instanceof Error
          ? error.message
          : "Platbu se nepodařilo založit.",
      );
      setPaying(false);
    }
  }

  return (
    <section className="checkout-panel" aria-label="Objednávka poukazu">
      <p className="shop-hero-brand">Objednávka</p>
      <p className="shop-hero-copy">
        Doplňte údaje k objednávce a pokračujte k platbě.
      </p>

      <div className="checkout-summary" aria-label="Souhrn objednávky">
        <div className="checkout-summary-main">
          <span className="checkout-summary-kicker">
            {item.kind === "amount" ? "Na částku" : "Zážitek"}
          </span>
          <div className="checkout-summary-title-row">
            <strong className="checkout-summary-title">{title}</strong>
            {form.quantity > 1 ? (
              <span className="checkout-summary-qty">×{form.quantity}</span>
            ) : null}
          </div>
          {subtitle ? (
            <span className="checkout-summary-subtitle">{subtitle}</span>
          ) : null}
        </div>

        <p className="checkout-summary-total">
          <span>
            Celkem
            {shippingFee > 0
              ? ` · ${form.delivery === "pickup" ? "balné" : "poštovné"} ${formatCzk(shippingFee)}`
              : ""}
          </span>
          <strong>{formatCzk(total)}</strong>
        </p>
      </div>

      <div className="checkout-fields">
        <div className="checkout-field">
          <span>Množství</span>
          <QuantityStepper
            value={form.quantity}
            min={QUANTITY_MIN}
            max={QUANTITY_MAX}
            onChange={(value) => updateForm("quantity", value)}
          />
        </div>
      </div>

      <div className="checkout-section">
        <p className="checkout-section-label">
          {form.quantity > 1 ? "Pro koho poukazy jsou?" : "Pro koho poukaz je?"}
        </p>
        <div
          className={
            form.recipient === "self"
              ? "checkout-choice-tabs is-self"
              : "checkout-choice-tabs is-other"
          }
          role="tablist"
          aria-label={
            form.quantity > 1 ? "Pro koho poukazy jsou?" : "Pro koho poukaz je?"
          }
        >
          <span className="checkout-choice-tabs-indicator" aria-hidden />
          <button
            type="button"
            role="tab"
            aria-selected={form.recipient === "other"}
            className={form.recipient === "other" ? "is-active" : undefined}
            onClick={() => updateForm("recipient", "other")}
          >
            <GiftIcon className="checkout-choice-icon" />
            Někdo jiný
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={form.recipient === "self"}
            className={form.recipient === "self" ? "is-active" : undefined}
            onClick={() => updateForm("recipient", "self")}
          >
            <UserIcon className="checkout-choice-icon" />
            Vy
          </button>
        </div>
      </div>

      <div className="checkout-fields">
        <label className="checkout-field">
          <span>Vaše jméno</span>
          <input
            type="text"
            autoComplete="name"
            value={form.buyerName}
            placeholder="Jan Novák"
            aria-invalid={touched && !form.buyerName.trim()}
            onChange={(event) => updateForm("buyerName", event.target.value)}
          />
        </label>

        <label className="checkout-field">
          <span>Vaše telefonní číslo</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            placeholder="+420 777 000 000"
            aria-invalid={touched && !form.phone.trim()}
            onChange={(event) =>
              updateForm("phone", event.target.value.replace(/[^\d+\s]/g, ""))
            }
          />
        </label>

        <label className="checkout-field">
          <span>Váš e-mail</span>
          <input
            type="email"
            autoComplete="email"
            value={form.buyerEmail}
            placeholder="jan@email.cz"
            aria-invalid={touched && !buyerEmailOk}
            onChange={(event) => updateForm("buyerEmail", event.target.value)}
          />
        </label>

        {form.recipient === "other" ? (
          <label className="checkout-field">
            <span>Jméno příjemce</span>
            <input
              type="text"
              autoComplete="off"
              value={form.recipientName}
              placeholder="Anna Nováková"
              aria-invalid={touched && !form.recipientName.trim()}
              onChange={(event) =>
                updateForm("recipientName", event.target.value)
              }
            />
          </label>
        ) : null}
      </div>

      <div className="checkout-section">
        <p className="checkout-section-label">
          {form.quantity > 1
            ? "Jak chcete poukazy doručit?"
            : "Jak chcete poukaz doručit?"}
        </p>
        <div
          className={
            form.delivery === "post"
              ? "checkout-delivery-tabs is-post"
              : form.delivery === "pickup"
                ? "checkout-delivery-tabs is-pickup"
                : "checkout-delivery-tabs is-email"
          }
          role="tablist"
          aria-label="Způsob doručení"
        >
          <span className="checkout-delivery-tabs-indicator" aria-hidden />
          <button
            type="button"
            role="tab"
            aria-selected={form.delivery === "email"}
            className={form.delivery === "email" ? "is-active" : undefined}
            onClick={() => updateForm("delivery", "email")}
          >
            <MailIcon className="checkout-choice-icon" />
            E-mail
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={form.delivery === "post"}
            className={form.delivery === "post" ? "is-active" : undefined}
            onClick={() => updateForm("delivery", "post")}
          >
            <PostIcon className="checkout-choice-icon" />
            Pošta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={form.delivery === "pickup"}
            className={form.delivery === "pickup" ? "is-active" : undefined}
            onClick={() => updateForm("delivery", "pickup")}
          >
            <PickupIcon className="checkout-choice-icon" />
            Pobočka
          </button>
        </div>

        {form.delivery === "email" ? (
          <div className="checkout-email-fields">
            <label className="checkout-field">
              <span>
                {form.quantity > 1
                  ? "Na jaký e-mail máme poukazy zaslat?"
                  : "Na jaký e-mail máme poukaz zaslat?"}
              </span>
              <input
                type="email"
                autoComplete="email"
                value={form.deliveryEmail}
                placeholder="jan@email.cz"
                aria-invalid={touched && !deliveryEmailOk}
                onChange={(event) =>
                  updateForm("deliveryEmail", event.target.value)
                }
              />
            </label>

            {form.recipient === "other" ? (
              <label className="checkout-field">
                <span>Osobní zpráva <em>(volitelná)</em></span>
                <textarea
                  rows={3}
                  value={form.message}
                  placeholder="Přání k poukazu…"
                  onChange={(event) =>
                    updateForm("message", event.target.value)
                  }
                />
              </label>
            ) : null}
          </div>
        ) : form.delivery === "post" ? (
          <div className="checkout-post-fields">
            <label className="checkout-field">
              <span>Jméno</span>
              <input
                type="text"
                autoComplete="shipping name"
                value={form.shippingName}
                placeholder="Jan Novák"
                aria-invalid={touched && !form.shippingName.trim()}
                onChange={(event) =>
                  updateForm("shippingName", event.target.value)
                }
              />
            </label>

            <label className="checkout-field">
              <span>Adresa</span>
              <input
                type="text"
                autoComplete="shipping address-line1"
                value={form.addressLine1}
                placeholder="Ulice a číslo popisné"
                aria-invalid={touched && !form.addressLine1.trim()}
                onChange={(event) =>
                  updateForm("addressLine1", event.target.value)
                }
              />
            </label>

            <div className="checkout-post-row">
              <label className="checkout-field">
                <span>Město</span>
                <input
                  type="text"
                  autoComplete="shipping address-level2"
                  value={form.city}
                  placeholder="Olomouc"
                  aria-invalid={touched && !form.city.trim()}
                  onChange={(event) => updateForm("city", event.target.value)}
                />
              </label>
              <label className="checkout-field">
                <span>PSČ</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="shipping postal-code"
                  value={form.postalCode}
                  placeholder="779 00"
                  aria-invalid={touched && !form.postalCode.trim()}
                  onChange={(event) =>
                    updateForm(
                      "postalCode",
                      event.target.value.replace(/[^\d\s]/g, ""),
                    )
                  }
                />
              </label>
            </div>

            <div className="checkout-field">
              <span>Země</span>
              <CheckoutSelect
                ariaLabel="Země"
                value={form.country}
                options={[
                  { value: "CZ", label: "Česko" },
                  { value: "SK", label: "Slovensko" },
                ]}
                onChange={(value) => updateForm("country", value)}
              />
            </div>

            <div
              className="checkout-shipping-option is-selected"
              role="radio"
              aria-checked="true"
            >
              <span className="checkout-shipping-option-check" aria-hidden />
              <div className="checkout-shipping-option-body">
                <div className="checkout-shipping-option-head">
                  <strong>
                    {isSlovakia
                      ? "Dárkové balení - Slovenská pošta"
                      : "Dárkové balení - Česká pošta"}
                  </strong>
                  <span>{formatCzk(postShippingFee)}</span>
                </div>
                <p>
                  Chodíme na poštu v úterý ráno. Odesíláme poukazy objednané
                  nejpozději předešlý den do 22:00. Přes státní svátky a víkend
                  na poštu nechodíme. Cena zahrnuje poštovné a balné.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="checkout-shipping-option is-selected"
            role="radio"
            aria-checked="true"
          >
            <span className="checkout-shipping-option-check" aria-hidden />
            <div className="checkout-shipping-option-body">
              <div className="checkout-shipping-option-head">
                <strong>Dárkové balení - vyzvednutí na recepci</strong>
                <span>{formatCzk(deliveryFees.pickupFee)}</span>
              </div>
              <p>
                Do 30 minut budete mít objednávku připravenou na recepci Long
                Story Short Hostel v Olomouci. Cena zahrnuje balné. Je možné
                také vypsat poukaz přímo na místě na libovolnou částku. Platit
                lze hotově i kartou.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="checkout-invoice">
        <label
          className={[
            form.wantInvoice
              ? "checkout-invoice-toggle is-checked"
              : "checkout-invoice-toggle",
            invoiceRequired ? "is-locked" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <input
            type="checkbox"
            checked={form.wantInvoice}
            disabled={invoiceRequired}
            onChange={(event) =>
              updateForm("wantInvoice", event.target.checked)
            }
          />
          <span className="checkout-invoice-toggle-mark" aria-hidden>
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M3.5 8.2 6.6 11.2 12.5 4.8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="checkout-invoice-toggle-label">
            Chci daňový doklad
          </span>
        </label>

        {invoiceRequired ? (
          <p className="checkout-invoice-hint">
            U nákupu od {formatCzk(INVOICE_REQUIRED_FROM_CZK)} je daňový doklad
            povinný.
          </p>
        ) : null}

        {form.wantInvoice ? (
          <div className="checkout-invoice-fields">
            <div className="checkout-section">
              <p className="checkout-section-label">Doklad vystavit</p>
              <div
                className={
                  form.invoiceRecipientType === "person"
                    ? "checkout-choice-tabs checkout-invoice-type-tabs is-person"
                    : form.invoiceRecipientType === "company"
                      ? "checkout-choice-tabs checkout-invoice-type-tabs is-company"
                      : "checkout-choice-tabs checkout-invoice-type-tabs is-unset"
                }
                role="tablist"
                aria-label="Typ daňového dokladu"
              >
                <span className="checkout-choice-tabs-indicator" aria-hidden />
                <button
                  type="button"
                  role="tab"
                  aria-selected={form.invoiceRecipientType === "company"}
                  className={
                    form.invoiceRecipientType === "company"
                      ? "is-active"
                      : undefined
                  }
                  onClick={() => updateForm("invoiceRecipientType", "company")}
                >
                  Na firmu
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={form.invoiceRecipientType === "person"}
                  className={
                    form.invoiceRecipientType === "person"
                      ? "is-active"
                      : undefined
                  }
                  onClick={() => updateForm("invoiceRecipientType", "person")}
                >
                  Na jméno
                </button>
              </div>
            </div>

            {form.invoiceRecipientType === "company" ? (
              <>
                <div className="checkout-field-row">
                  <label className="checkout-field">
                    <span>IČO</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={form.companyId}
                      placeholder="12345678"
                      aria-invalid={touched && !form.companyId.trim()}
                      onChange={(event) =>
                        updateForm(
                          "companyId",
                          event.target.value.replace(/[^\d]/g, ""),
                        )
                      }
                    />
                  </label>
                  <label className="checkout-field">
                    <span>
                      DIČ <em>(volitelné)</em>
                    </span>
                    <input
                      type="text"
                      autoComplete="off"
                      value={form.vatId}
                      placeholder="CZ12345678"
                      onChange={(event) =>
                        updateForm(
                          "vatId",
                          event.target.value.replace(/\s/g, "").toUpperCase(),
                        )
                      }
                    />
                  </label>
                </div>

                <label className="checkout-field">
                  <span>Na jaký e-mail máme zaslat daňový doklad?</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.invoiceEmail}
                    placeholder="jan@email.cz"
                    aria-invalid={touched && !invoiceEmailOk}
                    onChange={(event) =>
                      updateForm("invoiceEmail", event.target.value)
                    }
                  />
                </label>

                <label className="checkout-field">
                  <span>
                    Poznámka <em>(volitelné)</em>
                  </span>
                  <input
                    type="text"
                    value={form.invoiceNote}
                    placeholder="Např. číslo objednávky u vás"
                    onChange={(event) =>
                      updateForm("invoiceNote", event.target.value)
                    }
                  />
                </label>
              </>
            ) : null}

            {form.invoiceRecipientType === "person" ? (
              <>
                <div className="checkout-field-row">
                  <label className="checkout-field">
                    <span>Jméno</span>
                    <input
                      type="text"
                      autoComplete="given-name"
                      value={form.invoiceFirstName}
                      placeholder="Jan"
                      aria-invalid={touched && !form.invoiceFirstName.trim()}
                      onChange={(event) =>
                        updateForm("invoiceFirstName", event.target.value)
                      }
                    />
                  </label>
                  <label className="checkout-field">
                    <span>Příjmení</span>
                    <input
                      type="text"
                      autoComplete="family-name"
                      value={form.invoiceLastName}
                      placeholder="Novák"
                      aria-invalid={touched && !form.invoiceLastName.trim()}
                      onChange={(event) =>
                        updateForm("invoiceLastName", event.target.value)
                      }
                    />
                  </label>
                </div>

                <label className="checkout-field">
                  <span>Adresa</span>
                  <input
                    type="text"
                    autoComplete="street-address"
                    value={form.invoiceAddressLine1}
                    placeholder="Ulice a číslo popisné"
                    aria-invalid={touched && !form.invoiceAddressLine1.trim()}
                    onChange={(event) =>
                      updateForm("invoiceAddressLine1", event.target.value)
                    }
                  />
                </label>

                <div className="checkout-field-row">
                  <label className="checkout-field">
                    <span>Město</span>
                    <input
                      type="text"
                      autoComplete="address-level2"
                      value={form.invoiceCity}
                      placeholder="Olomouc"
                      aria-invalid={touched && !form.invoiceCity.trim()}
                      onChange={(event) =>
                        updateForm("invoiceCity", event.target.value)
                      }
                    />
                  </label>
                  <label className="checkout-field">
                    <span>PSČ</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={form.invoicePostalCode}
                      placeholder="779 00"
                      aria-invalid={touched && !form.invoicePostalCode.trim()}
                      onChange={(event) =>
                        updateForm(
                          "invoicePostalCode",
                          event.target.value.replace(/[^\d\s]/g, ""),
                        )
                      }
                    />
                  </label>
                </div>

                <label className="checkout-field">
                  <span>Na jaký e-mail máme zaslat daňový doklad?</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.invoiceEmail}
                    placeholder="jan@email.cz"
                    aria-invalid={touched && !invoiceEmailOk}
                    onChange={(event) =>
                      updateForm("invoiceEmail", event.target.value)
                    }
                  />
                </label>

                <label className="checkout-field">
                  <span>
                    Poznámka <em>(volitelné)</em>
                  </span>
                  <input
                    type="text"
                    value={form.invoiceNote}
                    placeholder="Např. číslo objednávky u vás"
                    onChange={(event) =>
                      updateForm("invoiceNote", event.target.value)
                    }
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {touched && !canPay ? (
        <p className="checkout-error" role="alert">
          {form.wantInvoice && !invoiceOk
            ? invoiceErrorMessage()
            : form.delivery === "post" && !postAddressOk
              ? "Vyplňte jméno, adresu, město a PSČ pro zaslání."
              : form.delivery === "email" && !deliveryEmailOk
                ? "Vyplňte platný e-mail pro doručení poukazu."
                : !buyerEmailOk
                  ? "Vyplňte platný e-mail."
                  : !form.phone.trim()
                    ? "Vyplňte telefonní číslo."
                    : form.recipient === "other"
                      ? "Vyplňte vaše jméno a jméno příjemce."
                      : "Vyplňte vaše jméno."}
        </p>
      ) : null}

      {payError ? (
        <p className="checkout-error" role="alert">
          {payError}
        </p>
      ) : null}

      <button
        type="button"
        className="buy-button"
        onMouseEnter={setBlobOrigin}
        onClick={() => {
          void handlePay();
        }}
        disabled={paying}
        aria-busy={paying}
      >
        <CardIcon className="buy-button-icon" />
        {paying ? "Přesměrovávám…" : `Zaplatit ${formatCzk(total)}`}
      </button>

      <p className="checkout-legal">
        Odesláním objednávky souhlasíte s{" "}
        <a
          href="https://www.longstoryshort.cz/pravidla-a-podminky"
          target="_blank"
          rel="noopener noreferrer"
        >
          obchodními podmínkami
        </a>
        .
      </p>
    </section>
  );
}

function AmountPanel({
  vouchers,
  selectedAmount,
  amountLabel,
  amountMarkSrc,
  amountMarkCompact,
  onSelect,
  onBuy,
}: {
  vouchers: AmountVoucher[];
  selectedAmount: number;
  amountLabel: string;
  amountMarkSrc?: string;
  amountMarkCompact?: boolean;
  onSelect: (amount: number) => void;
  onBuy: (amount: number) => void;
}) {
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const chipScrollerRef = useRef<HTMLDivElement>(null);
  const chipTrackRef = useRef<HTMLDivElement>(null);
  const chipThumbRef = useRef<HTMLSpanElement>(null);
  const chipScrollRaf = useRef<number | null>(null);

  const minAmount = vouchers[0]?.amount ?? 1000;
  const customAmount = Number(customInput.replace(/\s/g, ""));
  const hasCustomAmount =
    customInput.trim() !== "" && Number.isFinite(customAmount);
  const isBelowMin = hasCustomAmount && customAmount < minAmount;
  const hasValidCustom = hasCustomAmount && customAmount >= minAmount;
  const displayAmount = isCustom
    ? hasValidCustom
      ? customAmount
      : 0
    : selectedAmount;

  const updateChipScrollIndicator = () => {
    const scroller = chipScrollerRef.current;
    const track = chipTrackRef.current;
    const thumb = chipThumbRef.current;
    if (!scroller || !track || !thumb) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    if (maxScroll <= 4) {
      track.hidden = true;
      return;
    }

    track.hidden = false;
    const thumbWidth = (scroller.clientWidth / scroller.scrollWidth) * 100;
    const maxThumbOffset = 100 - thumbWidth;
    const thumbOffset =
      maxScroll > 0 ? (scroller.scrollLeft / maxScroll) * maxThumbOffset : 0;

    thumb.style.width = `${thumbWidth}%`;
    thumb.style.marginLeft = `${thumbOffset}%`;
  };

  const scheduleChipScrollUpdate = () => {
    if (chipScrollRaf.current !== null) return;

    chipScrollRaf.current = window.requestAnimationFrame(() => {
      chipScrollRaf.current = null;
      updateChipScrollIndicator();
    });
  };

  useEffect(() => {
    updateChipScrollIndicator();

    const scroller = chipScrollerRef.current;
    if (!scroller) return;

    scroller.addEventListener("scroll", scheduleChipScrollUpdate, {
      passive: true,
    });

    const observer = new ResizeObserver(updateChipScrollIndicator);
    observer.observe(scroller);
    window.addEventListener("resize", updateChipScrollIndicator);

    return () => {
      scroller.removeEventListener("scroll", scheduleChipScrollUpdate);
      observer.disconnect();
      window.removeEventListener("resize", updateChipScrollIndicator);

      if (chipScrollRaf.current !== null) {
        window.cancelAnimationFrame(chipScrollRaf.current);
      }
    };
  }, []);

  return (
    <section className="amount-panel" aria-label="Poukaz na částku">
      <div className="amount-preview" aria-live="polite">
        <div className="amount-preview-brand">
          <span className="amount-preview-label">{amountLabel}</span>
        </div>
        {amountMarkSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={amountMarkSrc}
            alt=""
            className={
              amountMarkCompact
                ? "amount-preview-mark is-compact"
                : "amount-preview-mark"
            }
            draggable={false}
            aria-hidden
          />
        ) : (
          <span className="amount-preview-oval" aria-hidden />
        )}
        <strong className="amount-preview-value">
          {isCustom && !hasValidCustom ? "- Kč" : formatCzk(displayAmount)}
        </strong>
      </div>

      <p className="panel-lead">Vyberte hodnotu poukazu</p>

      <div className="amount-chip-scroller-wrap">
        <div
          ref={chipScrollerRef}
          className="amount-chip-scroller"
        >
          <div className="amount-grid">
        {vouchers.map((voucher) => {
          const active = !isCustom && voucher.amount === selectedAmount;
          return (
            <button
              key={voucher.id}
              type="button"
              className={active ? "amount-chip is-active" : "amount-chip"}
              aria-pressed={active}
              onClick={() => {
                setIsCustom(false);
                onSelect(voucher.amount);
              }}
            >
              {formatCzk(voucher.amount)}
            </button>
          );
        })}
        <button
          type="button"
          className={isCustom ? "amount-chip is-active" : "amount-chip"}
          aria-pressed={isCustom}
          onClick={() => setIsCustom(true)}
        >
          Vlastní
        </button>
          </div>
        </div>
        <div
          ref={chipTrackRef}
          className="amount-chip-scroll-track"
          aria-hidden
          hidden
        >
          <span ref={chipThumbRef} className="amount-chip-scroll-thumb" />
        </div>
      </div>

      {isCustom ? (
        <div className="amount-custom">
          <label
            className={
              isBelowMin
                ? "amount-custom-field is-invalid"
                : "amount-custom-field"
            }
          >
            <span className="visually-hidden">Vlastní částka</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Zadejte částku"
              value={customInput}
              aria-invalid={isBelowMin}
              aria-describedby={isBelowMin ? "amount-custom-error" : undefined}
              onChange={(event) => {
                const next = event.target.value.replace(/[^\d\s]/g, "");
                setCustomInput(next);
                const parsed = Number(next.replace(/\s/g, ""));
                if (Number.isFinite(parsed) && parsed >= minAmount) {
                  onSelect(parsed);
                }
              }}
              autoFocus
            />
            <span className="amount-custom-suffix" aria-hidden>
              Kč
            </span>
          </label>
          {isBelowMin ? (
            <p className="amount-custom-error" id="amount-custom-error" role="alert">
              Minimální hodnota je {formatCzk(minAmount)}.
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="buy-button"
        onMouseEnter={setBlobOrigin}
        disabled={isCustom && !hasValidCustom}
        onClick={() => {
          if (isCustom && !hasValidCustom) return;
          onBuy(displayAmount);
        }}
      >
        <CartIcon className="buy-button-icon" />
        {isCustom && !hasValidCustom
          ? "Koupit poukaz na částku - Kč"
          : `Koupit poukaz na částku ${formatCzk(displayAmount)}`}
      </button>
    </section>
  );
}

function ExperiencePanel({
  vouchers,
  openId,
  onToggle,
  onBuy,
}: {
  vouchers: ExperienceVoucher[];
  openId: string | null;
  onToggle: (id: string | null) => void;
  onBuy: (voucher: ExperienceVoucher) => void;
}) {
  return (
    <section className="experience-panel" aria-label="Zážitkové poukazy">
      <ul className="experience-list">
        {vouchers.map((voucher) => (
          <ExperienceItem
            key={voucher.id}
            voucher={voucher}
            open={openId === voucher.id}
            onToggle={() =>
              onToggle(openId === voucher.id ? null : voucher.id)
            }
            onBuy={() => onBuy(voucher)}
          />
        ))}
      </ul>
    </section>
  );
}

function ExperienceItem({
  voucher,
  open,
  onToggle,
  onBuy,
}: {
  voucher: ExperienceVoucher;
  open: boolean;
  onToggle: () => void;
  onBuy: () => void;
}) {
  const isMobileGallery = useMaxWidth(519);
  const previewImage = voucher.gallery?.[0] ?? null;
  const summaryMainRef = useRef<HTMLDivElement>(null);
  const [thumbSize, setThumbSize] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !voucher.gallery || isMobileGallery) return;

    voucher.gallery.forEach((image) => {
      const preload = new window.Image();
      preload.src = image.src;
    });
  }, [open, voucher.gallery, isMobileGallery]);

  useLayoutEffect(() => {
    // Na mobilu pevná menší 1:1 miniatura — ne výška podle textu.
    if (!previewImage || isMobileGallery) {
      setThumbSize(null);
      return;
    }

    const main = summaryMainRef.current;
    if (!main) return;

    const updateSize = () => {
      const height = Math.round(main.getBoundingClientRect().height);
      setThumbSize(height > 0 ? height : null);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(main);
    return () => observer.disconnect();
  }, [
    previewImage,
    isMobileGallery,
    voucher.title,
    voucher.subtitle,
    voucher.suitableFor,
  ]);

  return (
    <li className={open ? "experience-item is-open" : "experience-item"}>
      <div className="experience-summary">
        {previewImage ? (
          <div
            className="experience-thumb"
            aria-hidden
            style={
              thumbSize
                ? { width: thumbSize, height: thumbSize, flexBasis: thumbSize }
                : undefined
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.src}
              alt=""
              className={
                isLogoImage(previewImage.src)
                  ? "experience-thumb-image is-logo"
                  : "experience-thumb-image"
              }
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        ) : null}

        <div className="experience-summary-main" ref={summaryMainRef}>
          <div className="experience-summary-copy">
            <div className="experience-top">
              <div className="experience-heading">
                <h2>{voucher.title}</h2>
                {voucher.subtitle ? <span>{voucher.subtitle}</span> : null}
              </div>
              <p className="experience-price">{formatCzk(voucher.price)}</p>
            </div>

            <p className="experience-suitable">Pro {voucher.suitableFor}</p>
          </div>

          <div className="experience-actions">
            <button
              type="button"
              className="buy-button buy-button-compact"
              onMouseEnter={setBlobOrigin}
              onClick={onBuy}
            >
              <CartIcon className="buy-button-icon" />
              Koupit
            </button>
            <button
              type="button"
              className="more-button"
              aria-expanded={open}
              onClick={onToggle}
            >
              {open ? "Méně" : "Více informací"}
              <ChevronIcon className="more-button-chevron" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={open ? "experience-details is-open" : "experience-details"}
        id={`${voucher.id}-details`}
      >
        <div className="experience-details-inner">
          <h3 className="experience-details-title">{voucher.title}</h3>
          <p>{voucher.description}</p>
          {open && voucher.gallery && voucher.gallery.length > 0 ? (
            <ExperienceGallery images={voucher.gallery} />
          ) : null}
          {voucher.infoLinks && voucher.infoLinks.length > 0 ? (
            <div className="experience-info-links">
              {voucher.infoLinks.map((link) => (
                <a
                  key={link.href}
                  className="experience-info-link"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="experience-info-link-icon" />
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
