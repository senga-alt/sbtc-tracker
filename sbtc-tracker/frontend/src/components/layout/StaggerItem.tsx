import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  enableHover?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

export function StaggerItem({
  children,
  className,
  enableHover = false,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={className}
      whileHover={enableHover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      whileTap={enableHover ? { scale: 0.98 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
