/*
 * CLCL
 *
 * fmt_RPA_view.c
 *
 * Copyright (C) 1996-2019 by Ohno Tomoaki. All rights reserved.
 *		https://www.nakka.com/
 *		nakka@nakka.com
 */

/* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE
#include <richedit.h>

/* Define */
#define WINDOW_CLASS			TEXT("CLCLFmtRPAView")

#define IDC_EDIT_TEXT			100

/* Global Variables */

/* Local Function Prototypes */

/*
 * font_create - フォントを作成する
 */
HFONT font_create(const TCHAR* FontName, const int FontSize, const int Charset, const int weight, const BOOL italic, const BOOL fixed)
{
	LOGFONT lf;
	HDC hdc;

	ZeroMemory(&lf, sizeof(LOGFONT));

	hdc = GetDC(NULL);
	lf.lfHeight = -(int)((FontSize * GetDeviceCaps(hdc, LOGPIXELSY)) / 72);
	ReleaseDC(NULL, hdc);

	lf.lfWidth = 0;
	lf.lfEscapement = 0;
	lf.lfOrientation = 0;
	lf.lfWeight = weight;
	lf.lfItalic = italic;
	lf.lfUnderline = FALSE;
	lf.lfStrikeOut = FALSE;
	lf.lfCharSet = Charset;
	lf.lfOutPrecision = OUT_DEFAULT_PRECIS;
	lf.lfClipPrecision = CLIP_DEFAULT_PRECIS;
	lf.lfQuality = DEFAULT_QUALITY;
	lf.lfPitchAndFamily = (BYTE)(((fixed == TRUE) ? FIXED_PITCH : DEFAULT_PITCH) | FF_DONTCARE);
	if (*FontName == TEXT('\0')) {
		NONCLIENTMETRICS ncm;
		ncm.cbSize = sizeof(NONCLIENTMETRICS);
		SystemParametersInfo(SPI_GETNONCLIENTMETRICS, sizeof(NONCLIENTMETRICS), &ncm, 0);
		lstrcpy(lf.lfFaceName, ncm.lfCaptionFont.lfFaceName);
	}
	else {
		lstrcpy(lf.lfFaceName, FontName);
	}
	return CreateFontIndirect((CONST LOGFONT*) & lf);
}

/*
 * txtview_proc - ウィンドウのプロシージャ
 */
static LRESULT CALLBACK txtview_proc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
	RECT window_rect;

	switch (msg) {
	case WM_CREATE:
		if (CreateWindowEx(WS_EX_CLIENTEDGE, TEXT("EDIT"), TEXT(""),
			WS_VISIBLE | WS_CHILD | ES_MULTILINE | WS_VSCROLL | WS_HSCROLL | ES_READONLY,
			0, 0, 0, 0,
			hWnd, (HMENU)IDC_EDIT_TEXT, ((LPCREATESTRUCT)lParam)->hInstance, NULL) == NULL) {
			DestroyWindow(hWnd);
			break;
		}
		HDC hdc = GetDC(hWnd);
		int char_set = GetTextCharset(hdc);
		ReleaseDC(hWnd, hdc);
		HFONT hFont = font_create(TEXT(""), 12, char_set, 0, 0, TRUE);
		if (hFont != NULL) {
			SendMessage(GetDlgItem(hWnd, IDC_EDIT_TEXT), WM_SETFONT, (WPARAM)hFont, MAKELPARAM(TRUE, 0));
			DeleteObject(hFont);
		}
		break;

	case WM_CLOSE:
		// ウィンドウを閉じる
		DestroyWindow(hWnd);
		break;

	case WM_DESTROY:
		if (GetDlgItem(hWnd, IDC_EDIT_TEXT) != NULL) {
			DestroyWindow(GetDlgItem(hWnd, IDC_EDIT_TEXT));
		}
		// ウィンドウの破棄
		return DefWindowProc(hWnd, msg, wParam, lParam);

	case WM_SIZE:
		// サイズ変更
		GetClientRect(hWnd, (LPRECT)&window_rect);
		MoveWindow(GetDlgItem(hWnd, IDC_EDIT_TEXT), 0, 0, window_rect.right, window_rect.bottom, TRUE);
		break;

	case WM_EXITSIZEMOVE:
		// サイズ変更完了
		break;

	case WM_SETFOCUS:
		SetFocus(GetDlgItem(hWnd, IDC_EDIT_TEXT));
		break;

	case WM_CTLCOLORSTATIC:
		return((LRESULT)GetStockObject(WHITE_BRUSH));

	case WM_SETTEXT:
		return SendMessage(GetDlgItem(hWnd, IDC_EDIT_TEXT), msg, wParam, lParam);

	default:
		return DefWindowProc(hWnd, msg, wParam, lParam);
	}
	return 0;
}

/*
 * register_RPA_view - ウィンドウクラスの登録
 */
BOOL register_RPA_view(const HINSTANCE hInstance)
{
	WNDCLASS wc;

	wc.style = 0;
	wc.lpfnWndProc = (WNDPROC)txtview_proc;
	wc.cbClsExtra = 0;
	wc.cbWndExtra = 0;
	wc.hInstance = hInstance;
	wc.hIcon = NULL;
	wc.hCursor = LoadCursor(NULL, IDC_ARROW);
	wc.hbrBackground = (HBRUSH)(COLOR_BTNFACE + 1);
	wc.lpszMenuName = NULL;
	wc.lpszClassName = WINDOW_CLASS;
	// ウィンドウクラスの登録
	return RegisterClass(&wc);
}

/*
 * create_RPA_view - ビューアの作成
 */
HWND create_RPA_view(const HINSTANCE hInstance, const HWND pWnd, int id)
{
	HWND hWnd;

	// ウィンドウの作成
	hWnd = CreateWindow(WINDOW_CLASS,
		TEXT(""),
		WS_TABSTOP | WS_CHILD,
		0, 0, 0, 0, pWnd, (HMENU)id, hInstance, NULL);
	return hWnd;
}
/* End of source */
