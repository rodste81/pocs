/*
 * tool_bitmap
 *
 * tool_bitmap.c
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

/* Define */
#define	INI_FILE_NAME				TEXT("tool_bitmap.ini")

/* Global Variables */
HINSTANCE hInst;
TCHAR app_path[BUF_SIZE];
TCHAR ini_path[BUF_SIZE];

TCHAR edit_bitmap_editer[BUF_SIZE];

/* Local Function Prototypes */
static BOOL dll_initialize(void);
static BOOL dll_uninitialize(void);

/*
 * DllMain - メイン
 */
int WINAPI DllMain(HINSTANCE hInstance, DWORD fdwReason, PVOID pvReserved)
{
	switch (fdwReason) {
	case DLL_PROCESS_ATTACH:
		hInst = hInstance;
		dll_initialize();
		break;

	case DLL_PROCESS_DETACH:
		dll_uninitialize();
		break;

	case DLL_THREAD_ATTACH:
	case DLL_THREAD_DETACH:
		break;
	}
	return TRUE;
}

/*
 * dll_initialize - 初期化
 */
static BOOL dll_initialize(void)
{
	TCHAR *p, *r;

	GetModuleFileName(hInst, app_path, BUF_SIZE - 1);
	for (p = r = app_path; *p != TEXT('\0'); p++) {
#ifndef UNICODE
		if (IsDBCSLeadByte((BYTE)*p) == TRUE) {
			p++;
			continue;
		}
#endif	// UNICODE
		if (*p == TEXT('\\') || *p == TEXT('/')) {
			r = p;
		}
	}
	*r = TEXT('\0');
	wsprintf(ini_path, TEXT("%s\\%s"), app_path, INI_FILE_NAME);

	GetPrivateProfileString(TEXT("edit_bitmap"), TEXT("editer"), TEXT("mspaint.exe"), edit_bitmap_editer, BUF_SIZE - 1, ini_path);
	return TRUE;
}

/*
 * dll_uninitialize - 終了処理
 */
static BOOL dll_uninitialize(void)
{
	return TRUE;
}

/*
 * get_tool_info_w - ツール情報取得
 */
__declspec(dllexport) BOOL CALLBACK get_tool_info_w(const HWND hWnd, const int index, TOOL_GET_INFO *tgi)
{
	switch (index) {
	case 0:
		lstrcpy(tgi->title, TEXT("ビットマップ編集(&E)"));
		lstrcpy(tgi->func_name, TEXT("edit_bitmap"));
		lstrcpy(tgi->cmd_line, TEXT(""));
		tgi->call_type = CALLTYPE_VIEWER;
		return TRUE;
	}
	return FALSE;
}
/* End of source */
