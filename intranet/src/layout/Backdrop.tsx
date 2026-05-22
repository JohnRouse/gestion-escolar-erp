import { useSidebar } from '../contexts/SidebarContext';

export default function Backdrop() {
  const { isOpen, close } = useSidebar();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden"
      onClick={close}
    />
  );
}