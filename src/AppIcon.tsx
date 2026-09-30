/** Original house artwork shared by the entry screen and each workspace. */
export function AppIcon({ className = "brand-mark" }: { className?: string }) {
  return (
    <img
      className={`app-icon ${className}`}
      src="/icons/home-app.png"
      width="512"
      height="512"
      alt=""
      draggable={false}
    />
  );
}
