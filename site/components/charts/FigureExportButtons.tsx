"use client";

interface FigureExportButtonsProps {
  svgContainerId: string;
  filenameBase: string;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getSvgElement(containerId: string): SVGElement | null {
  const container = document.getElementById(containerId);
  if (!container) return null;
  return container.querySelector("svg");
}

export function FigureExportButtons({
  svgContainerId,
  filenameBase
}: FigureExportButtonsProps): JSX.Element {
  const exportSvg = () => {
    const svg = getSvgElement(svgContainerId);
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    downloadBlob(new Blob([source], { type: "image/svg+xml;charset=utf-8" }), `${filenameBase}.svg`);
  };

  const exportPng = () => {
    const svg = getSvgElement(svgContainerId);
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width || 1200;
      canvas.height = image.height || 700;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
      }
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `${filenameBase}.png`);
        }
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  };

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={exportPng}
        className="rounded bg-action px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
      >
        Download PNG
      </button>
      <button
        type="button"
        onClick={exportSvg}
        className="rounded border border-action px-3 py-1.5 text-xs font-semibold text-action hover:bg-orange-50"
      >
        Download SVG
      </button>
    </div>
  );
}
