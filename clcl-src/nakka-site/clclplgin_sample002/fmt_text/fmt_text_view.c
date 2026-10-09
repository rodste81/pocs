/*
 * CLCL
 *
 * fmt_text_view.c
 *
 * Copyright (C) 1996-2003 by Nakashima Tomoaki. All rights reserved.
 *		http://www.nakka.com/
 *		nakka@nakka.com
 */

/* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE
#include <richedit.h>

#include "resource.h"

/* Define */
#define WINDOW_CLASS			TEXT("CLCLFmtTextView")

#define IDC_EDIT_TEXT			100

#define ID_MENU_TIMER			1

#define MENU_SELECT_ALL			(WM_APP + 1)

/* Global Variables */

/* Local Function Prototypes */

/*
 * txtview_proc - ウィンドウのプロシージャ
 */
static LRESULT CALLBACK txtview_proc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
	RECT window_rect;
	POINT apos;
	HMENU hMenu;
	DWORD ret;
	DWORD st, en;

	switch (msg) {
	case WM_CREATE:
		// RichEditの作成
		if (CreateWindowEx(WS_EX_CLIENTEDGE, TEXT("RICHEDIT"), NULL,
			WS_TABSTOP | WS_CHILD | WS_VISIBLE | WS_VSCROLL | WS_HSCROLL |
			ES_AUTOHSCROLL | ES_AUTOVSCROLL | ES_MULTILINE | ES_SAVESEL | ES_NOHIDESEL | ES_DISABLENOSCROLL | ES_WANTRETURN,
			0, 0, 0, 0, hWnd, (HMENU)IDC_EDIT_TEXT, ((LPCREATESTRUCT)lParam)->hInstance, NULL) == NULL) {
			DestroyWindow(hWnd);
			break;
		}
		SendMessage(GetDlgItem(hWnd, IDC_EDIT_TEXT), EM_LIMITTEXT, 0, 0);
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

	case WM_PARENTNOTIFY:
		if (LOWORD(wParam) == WM_RBUTTONDOWN) {
			SetTimer(hWnd, ID_MENU_TIMER, 100, NULL);
		}
		break;

	case WM_CONTEXTMENU:
		SetTimer(hWnd, ID_MENU_TIMER, 100, NULL);
		break;

	case WM_TIMER:
		// タイマー
		switch (wParam) {
		case ID_MENU_TIMER:
			if (GetKeyState(VK_RBUTTON) >= 0) {
				KillTimer(hWnd, wParam);

				// メニューの作成
				hMenu = CreatePopupMenu();
				AppendMenu(hMenu, MF_STRING | (SendMessage(GetDlgItem(hWnd, IDC_EDIT_TEXT), EM_CANUNDO, 0, 0) == TRUE) ? 0 : MF_GRAYED,
					WM_UNDO, TEXT("元に戻す(&U)"));
				AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
				SendMessage(GetDlgItem(hWnd, IDC_EDIT_TEXT), EM_GETSEL, (WPARAM)&st, (LPARAM)&en);
				AppendMenu(hMenu, MF_STRING | (st != en) ? 0 : MF_GRAYED, WM_CUT, TEXT("切り取り(&T)"));
				AppendMenu(hMenu, MF_STRING | (st != en) ? 0 : MF_GRAYED, WM_COPY, TEXT("コピー(&C)"));
				AppendMenu(hMenu, MF_STRING, WM_PASTE, TEXT("貼り付け(&P)"));
				AppendMenu(hMenu, MF_STRING | (st != en) ? 0 : MF_GRAYED, WM_CLEAR, TEXT("削除(&D)"));
				AppendMenu(hMenu, MF_SEPARATOR, 0, NULL);
				AppendMenu(hMenu, MF_STRING, MENU_SELECT_ALL, TEXT("すべて選択(&A)"));

				// メニューの表示
				GetCursorPos((LPPOINT)&apos);
				ret = TrackPopupMenu(hMenu, TPM_TOPALIGN | TPM_RETURNCMD, apos.x, apos.y, 0, hWnd, NULL);
				DestroyMenu(hMenu);
				if (ret <= 0) {
					break;
				}
				switch (ret) {
				case MENU_SELECT_ALL:
					// すべて選択
					SendMessage(GetDlgItem(hWnd, IDC_EDIT_TEXT), EM_SETSEL, 0, -1);
					break;

				default:
					SendMessage(GetDlgItem(hWnd, IDC_EDIT_TEXT), ret, 0, 0);
					break;
				}
			}
			break;
		}
		break;

	case EM_SETOPTIONS:
	case EM_GETOPTIONS:
	case EM_SETMODIFY:
	case EM_GETMODIFY:
	case EM_GETSEL:
	case EM_SETSEL:
	case WM_SETTEXT:
	case WM_GETTEXT:
	case WM_GETTEXTLENGTH:
	case WM_UNDO:
	case WM_CUT:
	case WM_COPY:
	case WM_PASTE:
	case WM_CLEAR:
		return SendMessage(GetDlgItem(hWnd, IDC_EDIT_TEXT), msg, wParam, lParam);

	default:
		return DefWindowProc(hWnd, msg, wParam, lParam);
	}
	return 0;
}

/*
 * txtview_regist - ウィンドウクラスの登録
 */
BOOL txtview_regist(const HINSTANCE hInstance)
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
 * txtview_create - テキストビューアの作成
 */
HWND txtview_create(const HINSTANCE hInstance, const HWND pWnd, int id)
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
