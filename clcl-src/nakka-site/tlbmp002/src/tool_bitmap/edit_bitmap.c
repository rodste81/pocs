/*
 * tool_bitmap
 *
 * edit_bitmap.c
 *
 * Copyright (C) 1996-2003 by Nakashima Tomoaki. All rights reserved.
 *		http://www.nakka.com/
 *		nakka@nakka.com
 */

/* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE

#include "..\CLCLPlugin.h"

#include "resource.h"

/* Define */

/* Global Variables */
extern HINSTANCE hInst;
extern TCHAR app_path[];
extern TCHAR ini_path[];

extern TCHAR edit_bitmap_editer[];

/* Local Function Prototypes */

/*
 * edit_bitmap - ビットマップ編集
 */
__declspec(dllexport) int CALLBACK edit_bitmap(const HWND hWnd, TOOL_EXEC_INFO *tei, TOOL_DATA_INFO *tdi)
{
	SHELLEXECUTEINFO sei;
	HANDLE hFile;
	DATA_INFO *di;
	TCHAR path[MAX_PATH];
	TCHAR cmd[BUF_SIZE];

	if (tdi == NULL) {
		return TOOL_SUCCEED;
	}

	// 形式選択
	di = (DATA_INFO *)SendMessage(hWnd, WM_ITEM_GET_FORMAT_TO_ITEM, (WPARAM)TEXT("BITMAP"), (LPARAM)tdi->di);
	if (di == NULL) {
		di = (DATA_INFO *)SendMessage(hWnd, WM_ITEM_GET_FORMAT_TO_ITEM, (WPARAM)TEXT("DIB"), (LPARAM)tdi->di);
		if (di == NULL) {
			return TOOL_SUCCEED;
		}
	}
	// 保存
	GetTempFileName(app_path, TEXT("cl2"), 0, path);
	DeleteFile(path);
	lstrcat(path, TEXT(".bmp"));
	if (di->data == NULL) {
		hFile = CreateFile(path, GENERIC_WRITE, 0, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
		if (hFile != NULL && hFile != (HANDLE)-1) {
			CloseHandle(hFile);
		}
	} else if (SendMessage(hWnd, WM_ITEM_TO_FILE, (WPARAM)path, (LPARAM)di) == FALSE) {
		return TOOL_ERROR;
	}
	wsprintf(cmd, TEXT("\"%s\""), path);

	// 編集
	sei.cbSize = sizeof(sei);
	sei.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_FLAG_NO_UI;
	sei.hwnd = NULL;
	sei.lpVerb = NULL;
	sei.lpFile = edit_bitmap_editer;
	sei.lpParameters = cmd;
	sei.lpDirectory = NULL;
	sei.nShow = SW_SHOWNORMAL;
	sei.hInstApp = hInst;
	if (ShellExecuteEx(&sei) == FALSE) {
		return TOOL_ERROR;
	}
	// 待機
	if (hWnd == (HWND)SendMessage(hWnd, WM_VIEWER_GET_HWND, 0, 0)) {
		EnableWindow(hWnd, FALSE);
	}
	while (WaitForSingleObject(sei.hProcess, 0) == WAIT_TIMEOUT) {
		MSG msg;
		if (PeekMessage(&msg, (HWND)NULL, 0, 0, PM_REMOVE)) {
			TranslateMessage(&msg);
			DispatchMessage(&msg);
		}
		Sleep(100);
	}
	if (hWnd == (HWND)SendMessage(hWnd, WM_VIEWER_GET_HWND, 0, 0)) {
		EnableWindow(hWnd, TRUE);
		SetForegroundWindow(hWnd);
	}

	SendMessage(hWnd, WM_ITEM_FREE_DATA, (WPARAM)di->format_name, (LPARAM)di->data);
	di->data = NULL;
	// 読み込み
	SendMessage(hWnd, WM_ITEM_FROM_FILE, (WPARAM)path, (LPARAM)di);
	DeleteFile(path);
	return TOOL_DATA_MODIFIED;
}

/*
 * set_edit_bitmap_proc - 設定
 */
BOOL CALLBACK set_edit_bitmap_proc(HWND hDlg, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
	OPENFILENAME of;
	TCHAR filename[MAX_PATH];

	switch (uMsg) {
	case WM_INITDIALOG:
		SendDlgItemMessage(hDlg, IDC_EDIT_APP, WM_SETTEXT, 0, (LPARAM)edit_bitmap_editer);
		break;

	case WM_CLOSE:
		EndDialog(hDlg, FALSE);
		break;

	case WM_COMMAND:
		switch (LOWORD(wParam)) {
		case IDC_BUTTON_BROWSE:
			*filename = TEXT('\0');
			SendDlgItemMessage(hDlg, IDC_EDIT_APP, WM_GETTEXT, MAX_PATH - 1, (LPARAM)filename);
			ZeroMemory(&of, sizeof(OPENFILENAME));
			of.lStructSize = sizeof(OPENFILENAME);
			of.hwndOwner = hDlg;
			of.lpstrFilter = TEXT("*.exe\0*.exe\0*.*\0*.*\0\0");
			of.nMaxCustFilter = 40;
			of.nFilterIndex = 1;
			of.lpstrFile = filename;
			of.nMaxFile = BUF_SIZE - 1;
			of.Flags = OFN_FILEMUSTEXIST | OFN_HIDEREADONLY;
			if (GetOpenFileName((LPOPENFILENAME)&of) == TRUE) {
				SendDlgItemMessage(hDlg, IDC_EDIT_APP, WM_SETTEXT, 0, (LPARAM)filename);
			}
			break;

		case IDOK:
			SendDlgItemMessage(hDlg, IDC_EDIT_APP, WM_GETTEXT, BUF_SIZE - 1, (LPARAM)edit_bitmap_editer);

			WritePrivateProfileString(TEXT("edit_bitmap"), TEXT("editer"), edit_bitmap_editer, ini_path);
			EndDialog(hDlg, TRUE);
			break;

		case IDCANCEL:
			EndDialog(hDlg, FALSE);
			break;
		}
		break;

	default:
		return FALSE;
	}
	return TRUE;
}

/*
 * edit_bitmap_property - プロパティ表示
 */
__declspec(dllexport) BOOL CALLBACK edit_bitmap_property(const HWND hWnd, TOOL_EXEC_INFO *tei)
{
	DialogBoxParam(hInst, MAKEINTRESOURCE(IDD_DIALOG_EDIT_BITMAP), hWnd, set_edit_bitmap_proc, 0);
	return TRUE;
}
/* End of source */
