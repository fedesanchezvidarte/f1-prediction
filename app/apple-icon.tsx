import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          borderRadius: "22%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgOTgyIDk4NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1taXRlcmxpbWl0OjI7Ij48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLDAsMCwxLC05LjE0NzcyMiwtOC40MzMpIj48ZyB0cmFuc2Zvcm09Im1hdHJpeCg2LjM1MzM0NCwwLDAsNi4zNTMzNDQsLTc3OC4yODExNjMsLTQ3NC44OTc1MzUpIj48cGF0aCBkPSJNMTY5LjQ5OCwxNTUuMTAzQzIwOS4yNDQsMTU1LjE0MSAyMDkuMjU0LDE1NS4xMDQgMjEwLjYwMiwxNTQuODUyQzIxMy4yNzIsMTU0LjM1NCAyMTQuMTYyLDE1Mi40NjQgMjIwLjEwNSwxNDIuMjdDMjMzLjkxNCwxMTguNTg3IDIzMy4wMTQsMTE1LjcyOSAyNDEuNSwxMTUuNjYyQzI3NS41NTYsMTE1LjM5NCAyNzYuMjI5LDExNC41NzYgMjc4LjAxOSwxMTYuODg2QzI3OS42NzIsMTE5LjAxOSAyNzguNjM2LDExOS41ODUgMjM4LjA2OSwxOTAuMjQ1QzIzNC4yNDYsMTk2LjkwNCAyMjguNTUyLDE5NC4xOTIgMTk0LjUwMiwxOTQuNzE5QzE4Ny41OTQsMTk0LjgyNiAxODkuMDQ4LDE5Ny44MTQgMTcxLjA1NCwyMjcuMjQzQzE2NS43MDgsMjM1Ljk4NyAxNjMuMDUyLDIyNy4yMTYgMTU3LjAwMywyMTYuNzY5QzEyOC40NzEsMTY3LjUgMTIzLjQwMywxNTkuODcyIDEyNC4wNzcsMTU3LjM3OEMxMjQuODE1LDE1NC42NDYgMTI2LjAyOSwxNTUuMTQgMTY5LjQ5OCwxNTUuMTAzWiIgc3R5bGU9ImZpbGw6I0NGMjYzNzsiLz48cGF0aCBkPSJNMjA3LjQ5Myw3Ni4wODVDMjE0LjcxMyw3Ni42MjYgMjE0LjAwNCw3OC42MTEgMjIxLjkyOCw5Mi4yNEMyMzAuODI0LDEwNy41MzkgMjMzLjU5OCwxMTEuMjgxIDIzMi44MDUsMTEzLjYzQzIzMS4zODQsMTE3LjgzNiAxOTguNDQzLDExNC43NDYgMTkyLjU0NywxMTUuNzg1QzE4Ni4zMDksMTE2Ljg4NCAxNzcuNjgsMTM4LjYxNCAxNjkuNTQ2LDE1MC41MzlDMTY2LjUwMSwxNTUuMDAzIDE2NC40MDQsMTUwLjkzMiAxNTMuMzg0LDEzMS41NjhDMTI0LjU0Miw4MC44OSAxMjIuNjA0LDgwLjY5NiAxMjQuNDMzLDc3LjQ0OUMxMjUuMjkxLDc1LjkyNiAxMjUuODU4LDc2LjA3MSAyMDcuNDkzLDc2LjA4NVoiIHN0eWxlPSJmaWxsOiNDRjI2Mzc7Ii8+PC9nPjwvZz48L3N2Zz4="
          alt="F1 Prediction"
          width={140}
          height={140}
        />
      </div>
    ),
    { ...size }
  );
}
