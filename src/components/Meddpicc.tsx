/** Renders "MEDDPICC" with the P crossed out in bold red — Paper Process is not an FE concern. */
export function Meddpicc({ className }: { className?: string }) {
  return (
    <span className={className}>
      MEDD
      <span
        style={{
          textDecoration: "line-through",
          textDecorationColor: "#ef4444",
          textDecorationThickness: "3px",
          textDecorationStyle: "solid",
        }}
      >
        P
      </span>
      ICC
    </span>
  );
}
