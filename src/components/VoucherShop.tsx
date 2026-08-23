"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AMOUNT_VOUCHERS,
  EXPERIENCE_VOUCHERS,
  formatCzk,
  type ExperienceGalleryImage,
  type ExperienceVoucher,
} from "@/data/vouchers";
import { setBlobOrigin } from "@/lib/blobOrigin";

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

type ShopTab = "amount" | "experience";

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

function ExperienceGallery({ images }: { images: ExperienceGalleryImage[] }) {
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
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 590px) calc((100vw - 3rem) / 4), 150px"
              quality={90}
              className={
                isLogoImage(image.src)
                  ? "experience-gallery-image is-logo"
                  : "experience-gallery-image"
              }
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
                className="gallery-lightbox-dots"
                role="tablist"
                aria-label="Pořadí fotografií"
              >
                {images.map((image, index) => (
                  <button
                    key={`${image.src}-${index}-dot`}
                    type="button"
                    role="tab"
                    className={
                      index === realIndex
                        ? "gallery-lightbox-dot is-active"
                        : "gallery-lightbox-dot"
                    }
                    aria-label={`Fotografie ${index + 1}`}
                    aria-selected={index === realIndex}
                    onClick={() => goToSlide(index)}
                  />
                ))}
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

export function VoucherShop() {
  const [tab, setTab] = useState<ShopTab>("experience");
  const [selectedAmount, setSelectedAmount] = useState(
    AMOUNT_VOUCHERS[0]?.amount ?? 1000,
  );
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="voucher-shop">
      <div className="shop-box">
        <section className="shop-hero" aria-label="Dárkové poukazy Long Story Short">
          <div className="shop-hero-media">
            <Image
              src="/poukazimg.jpeg"
              alt="Fyzické dárkové poukazy Long Story Short"
              fill
              priority
              sizes="(max-width: 720px) 100vw, 720px"
              className="shop-hero-image"
            />
          </div>
        </section>

        <div className="shop-box-body">
          <p className="shop-hero-brand">Long Story Short</p>
          <p className="shop-hero-copy">
            Vyberte poukaz na konkrétní zážitek, nebo na částku.
          </p>

          <div
            className={
              tab === "amount" ? "shop-tabs is-amount" : "shop-tabs is-experience"
            }
            role="tablist"
            aria-label="Typ poukazu"
          >
            <span className="shop-tabs-indicator" aria-hidden />
            <button
              type="button"
              role="tab"
              aria-selected={tab === "experience"}
              className={tab === "experience" ? "is-active" : undefined}
              onClick={() => setTab("experience")}
            >
              Zážitky
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "amount"}
              className={tab === "amount" ? "is-active" : undefined}
              onClick={() => setTab("amount")}
            >
              Na částku
            </button>
          </div>

          {tab === "experience" ? (
            <ExperiencePanel openId={openId} onToggle={setOpenId} />
          ) : (
            <AmountPanel
              selectedAmount={selectedAmount}
              onSelect={setSelectedAmount}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AmountPanel({
  selectedAmount,
  onSelect,
}: {
  selectedAmount: number;
  onSelect: (amount: number) => void;
}) {
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [chipScrollState, setChipScrollState] = useState<
    "none" | "start" | "middle" | "end"
  >("none");
  const [chipScrollThumb, setChipScrollThumb] = useState({
    width: 100,
    offset: 0,
  });
  const chipScrollerRef = useRef<HTMLDivElement>(null);

  const minAmount = AMOUNT_VOUCHERS[0]?.amount ?? 1000;
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

  const updateChipScrollState = () => {
    const scroller = chipScrollerRef.current;
    if (!scroller) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const thumbWidth = (scroller.clientWidth / scroller.scrollWidth) * 100;
    const maxThumbOffset = 100 - thumbWidth;
    const thumbOffset =
      maxScroll > 0 ? (scroller.scrollLeft / maxScroll) * maxThumbOffset : 0;

    setChipScrollThumb({ width: thumbWidth, offset: thumbOffset });

    if (maxScroll <= 4) {
      setChipScrollState("none");
      return;
    }

    if (scroller.scrollLeft <= 4) {
      setChipScrollState("start");
      return;
    }

    if (scroller.scrollLeft >= maxScroll - 4) {
      setChipScrollState("end");
      return;
    }

    setChipScrollState("middle");
  };

  useEffect(() => {
    updateChipScrollState();

    const scroller = chipScrollerRef.current;
    if (!scroller) return;

    scroller.addEventListener("scroll", updateChipScrollState, {
      passive: true,
    });

    const observer = new ResizeObserver(updateChipScrollState);
    observer.observe(scroller);
    window.addEventListener("resize", updateChipScrollState);

    return () => {
      scroller.removeEventListener("scroll", updateChipScrollState);
      observer.disconnect();
      window.removeEventListener("resize", updateChipScrollState);
    };
  }, []);

  return (
    <section className="amount-panel" aria-label="Poukaz na částku">
      <div className="amount-preview" aria-live="polite">
        <div className="amount-preview-brand">
          <span className="amount-preview-label">LSS Voucher</span>
        </div>
        <span className="amount-preview-oval" aria-hidden />
        <strong className="amount-preview-value">
          {isCustom && !hasValidCustom ? "- Kč" : formatCzk(displayAmount)}
        </strong>
      </div>

      <p className="panel-lead">Vyberte hodnotu poukazu</p>

      <div className="amount-chip-scroller-wrap">
        <div
          ref={chipScrollerRef}
          className="amount-chip-scroller"
          onScroll={updateChipScrollState}
        >
          <div className="amount-grid">
        {AMOUNT_VOUCHERS.map((voucher) => {
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
        {chipScrollState !== "none" ? (
          <div className="amount-chip-scroll-track" aria-hidden>
            <span
              className="amount-chip-scroll-thumb"
              style={{
                width: `${chipScrollThumb.width}%`,
                marginLeft: `${chipScrollThumb.offset}%`,
              }}
            />
          </div>
        ) : null}
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
  openId,
  onToggle,
}: {
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {
  return (
    <section className="experience-panel" aria-label="Zážitkové poukazy">
      <ul className="experience-list">
        {EXPERIENCE_VOUCHERS.map((voucher) => (
          <ExperienceItem
            key={voucher.id}
            voucher={voucher}
            open={openId === voucher.id}
            onToggle={() =>
              onToggle(openId === voucher.id ? null : voucher.id)
            }
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
}: {
  voucher: ExperienceVoucher;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={open ? "experience-item is-open" : "experience-item"}>
      <div className="experience-top">
        <div className="experience-heading">
          <h2>{voucher.title}</h2>
          {voucher.subtitle ? <span>{voucher.subtitle}</span> : null}
        </div>
        <p className="experience-price">{formatCzk(voucher.price)}</p>
      </div>

      <p className="experience-suitable">Pro {voucher.suitableFor}</p>

      <div className="experience-actions">
        <button
          type="button"
          className="buy-button buy-button-compact"
          onMouseEnter={setBlobOrigin}
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

      <div
        className={open ? "experience-details is-open" : "experience-details"}
        id={`${voucher.id}-details`}
      >
        <div className="experience-details-inner">
          <p>{voucher.description}</p>
          {voucher.gallery && voucher.gallery.length > 0 ? (
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
