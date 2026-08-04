"use client";

import { motion, AnimatePresence, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { type ReactNode } from "react";
import { useDir } from "@/hooks/use-dir";

const EASE = [0.22, 1, 0.36, 1] as const;

export function FadeIn({
  children,
  className,
  delay = 0,
  y = 12,
  ...rest
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : delay, ease: EASE }}
      suppressHydrationWarning
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({
  children,
  className,
  stagger = 0.05,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: reduce ? 0 : stagger },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 1 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: reduce ? 0 : 0.4, ease: EASE },
        },
      }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}

export function Pressable({
  children,
  className,
  ...rest
}: HTMLMotionProps<"button">) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      className={className}
      whileTap={reduce ? undefined : { scale: 0.96 }}
      whileHover={reduce ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/** Slides in from the logical END edge (right in LTR, left in RTL). */
export function SlideInFromEnd({
  children,
  className,
  show = true,
}: {
  children: ReactNode;
  className?: string;
  show?: boolean;
}) {
  const reduce = useReducedMotion();
  const dir = useDir();
  const xDir = dir === "rtl" ? "-100%" : "100%";
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className}
          initial={reduce ? { opacity: 0 } : { x: xDir, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { x: xDir, opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Subtle page-level fade + lift entrance. Wrap page content for consistent transitions. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : delay, ease: EASE }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}
