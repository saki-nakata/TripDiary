// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type ClickHandler = (e: { latlng: { lat: number; lng: number } }) => void;
let capturedClickHandler: ClickHandler | null = null;

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: () => <div data-testid="marker" />,
  useMapEvents: (handlers: { click: ClickHandler }) => {
    capturedClickHandler = handlers.click;
    return null;
  },
}));

vi.mock("leaflet", () => ({
  default: { icon: vi.fn().mockReturnValue({}) },
}));

import { LocationPicker } from "@/components/map/LocationPicker";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("LocationPicker", () => {
  beforeEach(() => {
    capturedClickHandler = null;
    vi.restoreAllMocks();
  });

  // ─── 初期表示 ───
  it("lat_lngがnull_ピン・住所は表示されない", () => {
    renderWithClient(<LocationPicker lat={null} lng={null} onChange={vi.fn()} />);

    expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    expect(screen.queryByText(/📍/)).not.toBeInTheDocument();
  });

  // ─── クリック ───
  it("地図クリック_onChangeが座標付きで呼ばれる", () => {
    const onChange = vi.fn();
    renderWithClient(<LocationPicker lat={null} lng={null} onChange={onChange} />);

    capturedClickHandler?.({ latlng: { lat: 35.0, lng: 135.0 } });

    expect(onChange).toHaveBeenCalledWith(35.0, 135.0);
  });

  // ─── 逆ジオコーディング ───
  it("座標指定あり_Nominatimの結果が住所として表示される", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ display_name: "京都府京都市右京区" }),
      })
    );

    renderWithClient(<LocationPicker lat={35.0} lng={135.0} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/京都府京都市右京区/)).toBeInTheDocument();
    });
  });

  it("逆ジオコーディング失敗_座標がフォールバック表示される", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    renderWithClient(<LocationPicker lat={35.0} lng={135.0} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/35\.00000, 135\.00000/)).toBeInTheDocument();
    });
  });

  // ─── リセット ───
  it("×ボタンクリック_onChangeがnullで呼ばれる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ display_name: "住所" }) })
    );
    const onChange = vi.fn();
    renderWithClient(<LocationPicker lat={35.0} lng={135.0} onChange={onChange} />);

    await waitFor(() => screen.getByLabelText("位置情報をリセット"));
    screen.getByLabelText("位置情報をリセット").click();

    expect(onChange).toHaveBeenCalledWith(null, null);
  });
});
