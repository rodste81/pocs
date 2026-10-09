/*
 * tool_text
 *
 * jis_to_sjis.c
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
#define ESC						0x1B

/* Global Variables */

/* Local Function Prototypes */

/*
 * SjisShift - JISの2バイトをSJISに変換
 */
static void SjisShift(int *ph, int *pl)
{
	if (*ph & 1) {
		if (*pl < 0x60) {
			*pl+=0x1F;
		} else {
			*pl+=0x20;
		}
	} else {
		*pl+=0x7E;
	}
	if (*ph < 0x5F) {
		*ph = (*ph + 0xE1) >> 1;
	} else {
		*ph = (*ph + 0x161) >> 1;
	}
}

/*
 * iso2022jp_sjis - ISO-2022-JP(JIS)をSJISに変換
 */
static char *iso2022jp_sjis(char *buf, char *ret)
{
	unsigned int c, d, j;
	BOOL jiskanji, hankaku;
	char *p, *r;

	*ret = '\0';

	p = buf;
	r = ret;
	j = 0;
	jiskanji = FALSE;
	hankaku = FALSE;
	while (*p != '\0') {
		j++;
		c = *(p++);
		if (c == ESC) {
			if (*p == '\0') {
				break;
			}
			if ((c = *(p++)) == '$') {
				if ((c = *(p++)) == '@' || c == 'B') {
					jiskanji = TRUE;
				} else {
					*(r++) = ESC;
					*(r++) = '$';
					if (c != '\0') {
						*(r++) = c;
					}
				}
			} else if (c == '(') {
				if ((c = *(p++)) == 'H' || c == 'J' || c == 'B') {
					jiskanji = FALSE;
				} else {
					jiskanji = FALSE;
					*(r++) = ESC;
					*(r++) = '(';
					if (c != '\0') {
						*(r++) = c;
					}
				}
			} else if (c == '*') {
				if ((c = *(p++)) == 'B') {
					hankaku = FALSE;
				} else if (c == 'I') {
					hankaku = TRUE;
				}
			} else if (hankaku == TRUE && c == 'N') {
				c = *(p++);
				*(r++) = c + 0x80;
			} else if (c == 'K') {
				jiskanji = TRUE;
			} else if (c == 'H') {
				jiskanji = FALSE;
			} else {
				*(r++) = ESC;
				if (c != '\0') {
					*(r++) = c;
				}
			}
		} else if (jiskanji && (c == '\r' || c == '\n')) {
			jiskanji = FALSE;
			*(r++) = c;
		} else if (jiskanji && c >= 0x21 && c <= 0x7E) {
			if (*p == '\0') {
				break;
			}
			if ((d = *(p++)) >= 0x21 && d <= 0x7E) {
				SjisShift((int *)&c, (int *)&d);
			}
			*(r++) = c;
			if (d != '\0') {
				*(r++) = d;
			}
		} else if (c >= 0xA1 && c <= 0xFE) {
			if (*p == '\0') {
				break;
			}
			if ((d = *(p++)) >= 0xA1 && d <= 0xFE) {
				d &= 0x7E;
				c &= 0x7E;
				SjisShift((int *)&c, (int *)&d);
			}
			*(r++) = c;
			if (d != '\0') {
				*(r++) = d;
			}
		} else if (c == 0x0E) {
			while (*p != '\0' && *p != 0x0F && *p != '\r' && *p != '\n' && *p != ESC) {
				*(r++) = *(p++) + 0x80;
			}
			if (*p == 0x0F) {
				p++;
			}
		} else {
			*(r++) = c;
		}
	}
	*r = '\0';
	return r;
}

/*
 * item_jis_to_sjis - JISをSJISに変換
 */
static int item_jis_to_sjis(DATA_INFO *di)
{
	HANDLE ret;
	BYTE *from_mem, *to_mem;

	// メモリのロック
	if ((from_mem = GlobalLock(di->data)) == NULL) {
		return TOOL_ERROR;
	}

	// コピー先確保
	if ((ret = GlobalAlloc(GHND, di->size * 4 + 1)) == NULL) {
		GlobalUnlock(di->data);
		return TOOL_ERROR;
	}
	// コピー先ロック
	if ((to_mem = GlobalLock(ret)) == NULL) {
		GlobalFree(ret);
		GlobalUnlock(di->data);
		return TOOL_ERROR;
	}

	// SJISに変換
	iso2022jp_sjis(from_mem, to_mem);
	di->size = strlen(to_mem) + 1;

	GlobalUnlock(ret);
	GlobalUnlock(di->data);

	GlobalFree(di->data);
	di->data = ret;
	return TOOL_DATA_MODIFIED;
}

/*
 * jis_to_sjis - JISをSJISに変換
 */
__declspec(dllexport) int CALLBACK jis_to_sjis(const HWND hWnd, TOOL_EXEC_INFO *tei, TOOL_DATA_INFO *tdi)
{
	DATA_INFO *di;
	int ret = TOOL_SUCCEED;

	for (; tdi != NULL; tdi = tdi->next) {
		di = (DATA_INFO *)SendMessage(hWnd, WM_ITEM_GET_FORMAT_TO_ITEM, (WPARAM)TEXT("TEXT"), (LPARAM)tdi->di);
		if (di != NULL && di->data != NULL) {
			ret |= item_jis_to_sjis(di);
		}
	}
	return ret;
}

/*
 * jis_to_sjis_property - プロパティ表示
 */
__declspec(dllexport) BOOL CALLBACK jis_to_sjis_property(const HWND hWnd, TOOL_EXEC_INFO *tei)
{
	return FALSE;
}
/* End of source */
