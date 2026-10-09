/*
 * CLCL
 *
 * fmt_metafile_view.c
 *
 * Copyright (C) 1996-2003 by Nakashima Tomoaki. All rights reserved.
 *		http://www.nakka.com/
 *		nakka@nakka.com
 */

/* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE

#include "fmt_metafile_view.h"
#include "..\CLCLPlugin.h"

/* Define */
#define WINDOW_CLASS				TEXT("CLCLFmtMetaView")

/* Global Variables */
typedef struct _BUFFER {
	DATA_INFO *di;

	HBRUSH draw_brush;
} BUFFER;

/* Local Function Prototypes */

/*
 * binview_proc - ウィンドウのプロシージャ
 */
static LRESULT CALLBACK binview_proc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
	PAINTSTRUCT ps;
	RECT window_rect;
	HDC hdc;
	BUFFER *bf;
	BYTE *mem;

	switch (msg) {
	case WM_CREATE:
		bf = LocalAlloc(LPTR, sizeof(BUFFER));
		if (bf == NULL) {
			return -1;
		}

		// 背景ブラシ
		bf->draw_brush = CreateSolidBrush(GetSysColor(COLOR_WINDOW));

		// ウィンドウ作成
		SetWindowLong(hWnd, GWL_USERDATA, (LPARAM)bf);
		break;

	case WM_CLOSE:
		// ウィンドウを閉じる
		DestroyWindow(hWnd);
		break;

	case WM_DESTROY:
		bf = (BUFFER *)GetWindowLong(hWnd, GWL_USERDATA);
		if (bf != NULL) {
			SetWindowLong(hWnd, GWL_USERDATA, (LPARAM)0);
			DeleteObject(bf->draw_brush);
			LocalFree(bf);
		}
		// ウィンドウの破棄
		return DefWindowProc(hWnd, msg, wParam, lParam);

	case WM_SIZE:
		InvalidateRect(hWnd, NULL, FALSE);
		UpdateWindow(hWnd);
		break;

	case WM_EXITSIZEMOVE:
		// サイズ変更完了
		break;

	case WM_SETFOCUS:
		break;

	case WM_KILLFOCUS:
		break;

	case WM_GETDLGCODE:
		return DLGC_WANTALLKEYS;

	case WM_LBUTTONDOWN:
	case WM_RBUTTONDOWN:
	case WM_LBUTTONUP:
		SetFocus(hWnd);
		break;

	case WM_PAINT:
		// 描画
		bf = (BUFFER *)GetWindowLong(hWnd, GWL_USERDATA);
		if (bf == NULL) {
			break;
		}

		hdc = BeginPaint(hWnd, &ps);

		// 描画の初期化
		GetClientRect(hWnd, &window_rect);
		FillRect(hdc, &window_rect, bf->draw_brush);

		if (bf->di != NULL && bf->di->data != NULL) {
			if (lstrcmpi(bf->di->format_name, TEXT("METAFILE PICTURE")) == 0) {
				// メタファイルの描画
				if ((mem = GlobalLock(bf->di->data)) != NULL) {
					SetMapMode(hdc, ((METAFILEPICT *)mem)->mm);
					SetWindowExtEx(hdc, window_rect.right, window_rect.bottom, NULL);
					SetViewportExtEx(hdc, window_rect.right, window_rect.bottom, NULL);
					PlayMetaFile(hdc, ((METAFILEPICT *)mem)->hMF);
					GlobalUnlock(bf->di->data);
				}
			} else {
				// 拡張メタファイルの描画
				PlayEnhMetaFile(hdc, bf->di->data, &window_rect);
			}
		}

		EndPaint(hWnd, &ps);
		break;

	case WM_ERASEBKGND:
		return 1;

	case WM_KEYDOWN:
		switch ((int)wParam) {
		case VK_TAB:
			SetFocus(GetParent(hWnd));
			break;
		}
		break;

	case WM_SET_METADATA:
		bf = (BUFFER *)GetWindowLong(hWnd, GWL_USERDATA);
		if (bf == NULL) {
			break;
		}

		// データ設定
		bf->di = (DATA_INFO *)lParam;
		break;

	default:
		return DefWindowProc(hWnd, msg, wParam, lParam);
	}
	return 0;
}

/*
 * metaview_regist - ウィンドウクラスの登録
 */
BOOL metaview_regist(const HINSTANCE hInstance)
{
	WNDCLASS wc;

	wc.style = CS_DBLCLKS;
	wc.lpfnWndProc = (WNDPROC)binview_proc;
	wc.cbClsExtra = 0;
	wc.cbWndExtra = 0;
	wc.hInstance = hInstance;
	wc.hIcon = NULL;
	wc.hCursor = LoadCursor(NULL, IDC_ARROW);
	wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
	wc.lpszMenuName = NULL;
	wc.lpszClassName = WINDOW_CLASS;
	// ウィンドウクラスの登録
	return RegisterClass(&wc);
}

/*
 * metaview_create - ビットマップビューアの作成
 */
HWND metaview_create(const HINSTANCE hInstance, const HWND pWnd, int id)
{
	HWND hWnd;

	// ウィンドウの作成
	hWnd = CreateWindowEx(WS_EX_CLIENTEDGE, WINDOW_CLASS,
		TEXT(""),
		WS_TABSTOP | WS_CHILD | WS_VISIBLE,
		0, 0, 0, 0, pWnd, (HMENU)id, hInstance, NULL);
	return hWnd;
}
/* End of source */
