CREATE OR REPLACE PACKAGE BODY STORE_DAY_SQL_V2 AS
--------------------------------------------------------------------
FUNCTION GET_STORE_DAY(O_error_message      IN OUT  VARCHAR2,
                       O_store              IN OUT  SA_STORE_DAY.STORE%TYPE,
                       O_business_date      IN OUT  SA_STORE_DAY.BUSINESS_DATE%TYPE,
                       O_data_status        IN OUT  SA_STORE_DAY.DATA_STATUS%TYPE,
                       I_store_day_seq_no   IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE)
   RETURN BOOLEAN IS

   L_program  VARCHAR2(64) := 'STORE_DAY_SQL.GET_STORE_DAY';

    cursor C_GET_STORE_AND_DATE is
      select store,
             business_date,
             data_status
        from sa_store_day
       where store_day_seq_no = I_store_day_seq_no;

BEGIN
   if I_store_day_seq_no is not NULL then
      SQL_LIB.SET_MARK('OPEN','C_GET_STORE_AND_DATE','SA_STORE_DAY',
                              'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      open C_GET_STORE_AND_DATE;
      SQL_LIB.SET_MARK('FETCH','C_GET_STORE_AND_DATE','SA_STORE_DAY',
                               'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      fetch C_GET_STORE_AND_DATE into O_store,
                                      O_business_date,
                                      O_data_status;
      SQL_LIB.SET_MARK('CLOSE','C_GET_STORE_AND_DATE','SA_STORE_DAY',
                               'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      close C_GET_STORE_AND_DATE;
      ---
      if O_store is NULL then
         O_error_message := SQL_LIB.CREATE_MSG('STORE_DAY_NOT_FOUND',
                                               NULL,
                                               NULL,
                                               NULL);
         return FALSE;
      end if;
   else
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_STORE_DAY;
-----------------------------------------------------------------
FUNCTION GET_INTERNAL_DAY(O_error_message      IN OUT  VARCHAR2,
                          O_store              IN OUT  SA_STORE_DAY.STORE%TYPE,
                          O_day                IN OUT  SA_STORE_DAY.DAY%TYPE,
                          I_store_day_seq_no   IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                          I_total_seq_no       IN      SA_TOTAL.TOTAL_SEQ_NO%TYPE,
                          I_error_seq_no       IN      SA_ERROR.ERROR_SEQ_NO%TYPE,
                          I_update_id          IN      SA_TRAN_HEAD.UPDATE_ID%TYPE,
                          I_tran_seq_no        IN      SA_TRAN_HEAD.TRAN_SEQ_NO%TYPE)
   RETURN BOOLEAN IS

   L_program  VARCHAR2(64) := 'STORE_DAY_SQL.GET_INTERNAL_DAY';

    cursor C_GET_INTERNAL_DAY is
      select store,
             day
        from sa_store_day
       where store_day_seq_no = I_store_day_seq_no;

    cursor C_GET_FROM_SA_TOTAL is
       select store,
              day
         from sa_total
        where total_seq_no = I_total_seq_no
          and rownum = 1;

    cursor C_GET_FROM_SA_ERROR is
       select store,
              day
         from sa_error
        where error_seq_no = I_error_seq_no;

    cursor C_GET_FROM_V_SA_TOTAL is
       select store,
              day
         from v_sa_total
        where update_id = I_update_id
          and rownum = 1;

    cursor C_GET_FROM_SA_TRAN_HEAD is
       select store,
              day
         from sa_tran_head
        where tran_seq_no = I_tran_seq_no;

BEGIN
   if I_store_day_seq_no is not NULL then
      SQL_LIB.SET_MARK('OPEN','C_GET_INTERNAL_DAY','SA_STORE_DAY',
                              'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      open C_GET_INTERNAL_DAY;
      SQL_LIB.SET_MARK('FETCH','C_GET_INTERNAL_DAY','SA_STORE_DAY',
                               'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      fetch C_GET_INTERNAL_DAY into O_store,
                                    O_day;
      SQL_LIB.SET_MARK('CLOSE','C_GET_INTERNAL_DAY','SA_STORE_DAY',
                               'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      close C_GET_INTERNAL_DAY;
      ---
   elsif I_tran_seq_no is not NULL then
      SQL_LIB.SET_MARK('OPEN','C_GET_FROM_SA_TRAN_HEAD','SA_TRAN_HEAD',
                              'Tran Seq No.: '||to_char(I_tran_seq_no));
      open C_GET_FROM_SA_TRAN_HEAD;
      SQL_LIB.SET_MARK('FETCH','C_GET_FROM_SA_TRAN_HEAD','SA_TRAN_HEAD',
                               'Tran Seq No.: '||to_char(I_tran_seq_no));
      fetch C_GET_FROM_SA_TRAN_HEAD into O_store,
                                         O_day;
      SQL_LIB.SET_MARK('CLOSE','C_GET_FROM_SA_TRAN_HEAD','SA_TRAN_HEAD',
                               'Tran Seq No.: '||to_char(I_tran_seq_no));
      close C_GET_FROM_SA_TRAN_HEAD;
   elsif I_total_seq_no is not NULL then
      SQL_LIB.SET_MARK('OPEN','C_GET_FROM_SA_TOTAL','SA_TOTAL',
                              'Total Seq No.: '||to_char(I_total_seq_no));
      open C_GET_FROM_SA_TOTAL;
      SQL_LIB.SET_MARK('FETCH','C_GET_FROM_SA_TOTAL','SA_TOTAL',
                               'Total Seq No.: '||to_char(I_total_seq_no));
      fetch C_GET_FROM_SA_TOTAL into O_store,
                                     O_day;
      SQL_LIB.SET_MARK('CLOSE','C_GET_FROM_SA_TOTAL','SA_TOTAL',
                               'Total Seq No.: '||to_char(I_total_seq_no));
      close C_GET_FROM_SA_TOTAL;
   elsif I_error_seq_no is not NULL then
      SQL_LIB.SET_MARK('OPEN','C_GET_FROM_SA_ERROR','SA_ERROR',
                              'Error Seq No.: '||to_char(I_error_seq_no));
      open C_GET_FROM_SA_ERROR;
      SQL_LIB.SET_MARK('FETCH','C_GET_FROM_SA_ERROR','SA_ERROR',
                               'Error Seq No.: '||to_char(I_error_seq_no));
      fetch C_GET_FROM_SA_ERROR into O_store,
                                     O_day;
      SQL_LIB.SET_MARK('CLOSE','C_GET_FROM_SA_ERROR','SA_ERROR',
                               'Error Seq No.: '||to_char(I_error_seq_no));
      close C_GET_FROM_SA_ERROR;
   elsif I_update_id is not NULL then
      SQL_LIB.SET_MARK('OPEN','C_GET_FROM_V_SA_TOTAL','V_SA_TOTAL',
                              'Update ID: '||to_char(I_update_id));
      open C_GET_FROM_V_SA_TOTAL;
      SQL_LIB.SET_MARK('FETCH','C_GET_FROM_V_SA_TOTAL','V_SA_TOTAL',
                               'Update ID: '||to_char(I_update_id));
      fetch C_GET_FROM_V_SA_TOTAL into O_store,
                                       O_day;
      SQL_LIB.SET_MARK('CLOSE','C_GET_FROM_V_SA_TOTAL','V_SA_TOTAL',
                               'Update ID: '||to_char(I_update_id));
      close C_GET_FROM_V_SA_TOTAL;
   else
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   if O_store is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('STORE_DAY_NOT_FOUND',
                                            NULL,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   return TRUE;
EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_INTERNAL_DAY;
-----------------------------------------------------------------
FUNCTION GET_TRAN_COUNT(O_error_message      IN OUT  VARCHAR2,
                        O_tran_count         IN OUT  NUMBER,
                        I_store_day_seq_no   IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                        I_bal_group_seq_no   IN      SA_BALANCE_GROUP.BAL_GROUP_SEQ_NO%TYPE,
                        I_store              IN      SA_TRAN_HEAD.STORE%TYPE DEFAULT NULL,
                        I_day                IN      SA_TRAN_HEAD.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program         VARCHAR2(60)  := 'STORE_DAY_SQL.GET_TRAN_COUNT';
   L_bal_level       SA_SYSTEM_OPTIONS.BALANCE_LEVEL_IND%TYPE;
   L_cashier         SA_BALANCE_GROUP.CASHIER%TYPE;
   L_register        SA_BALANCE_GROUP.REGISTER%TYPE;
   L_start_datetime  SA_BALANCE_GROUP.START_DATETIME%TYPE;
   L_end_datetime    SA_BALANCE_GROUP.END_DATETIME%TYPE;
   L_store           SA_STORE_DAY.STORE%TYPE := I_store;
   L_day             SA_STORE_DAY.DAY%TYPE := I_day;

   cursor C_GET_TRAN_COUNT is
      select COUNT(tran_seq_no)
        from sa_tran_head
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day
         and status != 'D';

   cursor C_GET_BALANCE_GROUP_INFO is
      select cashier,
             register,
             start_datetime,
             end_datetime
        from sa_balance_group
       where store_day_seq_no = I_store_day_seq_no
         and bal_group_seq_no = I_bal_group_seq_no;

   cursor C_GET_TRAN_COUNT_CASHIER is
       select COUNT(tran_seq_no)
        from sa_tran_head
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day
         and cashier          = L_cashier
         and tran_datetime BETWEEN NVL(L_start_datetime,tran_datetime)
                                   and NVL(L_end_datetime,tran_datetime)
         and status != 'D';

   cursor C_GET_TRAN_COUNT_REGISTER is
      select COUNT(tran_seq_no)
        from sa_tran_head
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day
         and register         = L_register
         and tran_datetime BETWEEN NVL(L_start_datetime,tran_datetime)
                                   and NVL(L_end_datetime,tran_datetime)
         and status != 'D';

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;
   ---
   O_tran_count := 0;
   ---
   if I_bal_group_seq_no is NULL then
      SQL_LIB.SET_MARK('OPEN','C_GET_TRAN_COUNT','SA_TRAN_HEAD',
                              'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      open C_GET_TRAN_COUNT;
      SQL_LIB.SET_MARK('FETCH','C_GET_TRAN_COUNT','SA_TRAN_HEAD',
                               'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      fetch C_GET_TRAN_COUNT into O_tran_count;
      SQL_LIB.SET_MARK('CLOSE','C_GET_TRAN_COUNT','SA_TRAN_HEAD',
                               'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      close C_GET_TRAN_COUNT;
   else
      if SA_SYSTEM_OPTIONS_SQL.GET_BAL_LEVEL(O_error_message,
                                             L_bal_level) = FALSE then
         return FALSE;
      end if;
      ---
      SQL_LIB.SET_MARK('OPEN','C_GET_BALANCE_GROUP_INFO','SA_BALANCE_GROUP',
                              'Bal. Group Seq No.: '||to_char(I_bal_group_seq_no));
      open C_GET_BALANCE_GROUP_INFO;
      SQL_LIB.SET_MARK('FETCH','C_GET_BALANCE_GROUP_INFO','SA_BALANCE_GROUP',
                               'Bal. Group Seq No.: '||to_char(I_bal_group_seq_no));
      fetch C_GET_BALANCE_GROUP_INFO into L_cashier,
                                          L_register,
                                          L_start_datetime,
                                          L_end_datetime;
      SQL_LIB.SET_MARK('CLOSE','C_GET_BALANCE_GROUP_INFO','SA_BALANCE_GROUP',
                               'Bal. Group Seq No.: '||to_char(I_bal_group_seq_no));
      close C_GET_BALANCE_GROUP_INFO;
      ---
      if L_bal_level = 'C' then
         SQL_LIB.SET_MARK('OPEN','C_GET_TRAN_COUNT_CASHIER','SA_TRAN_HEAD',NULL);
         open C_GET_TRAN_COUNT_CASHIER;
         SQL_LIB.SET_MARK('FETCH','C_GET_TRAN_COUNT_CASHIER','SA_TRAN_HEAD',NULL);
         fetch C_GET_TRAN_COUNT_CASHIER into O_tran_count;
         SQL_LIB.SET_MARK('CLOSE','C_GET_TRAN_COUNT_CASHIER','SA_TRAN_HEAD',NULL);
         close C_GET_TRAN_COUNT_CASHIER;
      elsif L_bal_level = 'R' then
         SQL_LIB.SET_MARK('OPEN','C_GET_TRAN_COUNT_REGISTER','SA_TRAN_HEAD',NULL);
         open C_GET_TRAN_COUNT_REGISTER;
         SQL_LIB.SET_MARK('FETCH','C_GET_TRAN_COUNT_REGISTER','SA_TRAN_HEAD',NULL);
         fetch C_GET_TRAN_COUNT_REGISTER into O_tran_count;
         SQL_LIB.SET_MARK('CLOSE','C_GET_TRAN_COUNT_REGISTER','SA_TRAN_HEAD',NULL);
         close C_GET_TRAN_COUNT_REGISTER;
      end if;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_TRAN_COUNT;
-----------------------------------------------------------------
FUNCTION GET_ERROR_COUNT(O_error_message     IN OUT   VARCHAR2,
                         O_error_count       IN OUT   NUMBER,
                         I_store_day_seq_no  IN       SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                         I_bal_group_seq_no  IN       SA_BALANCE_GROUP.BAL_GROUP_SEQ_NO%TYPE,
				         I_emp_type          IN       SA_EMPLOYEE.EMP_TYPE%TYPE,
                         I_store             IN       SA_ERROR.STORE%TYPE DEFAULT NULL,
                         I_day               IN       SA_ERROR.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program         VARCHAR2(60)   := 'STORE_DAY_SQL.GET_ERROR_COUNT';
   L_bal_level       SA_SYSTEM_OPTIONS.BALANCE_LEVEL_IND%TYPE;
   L_error_message   VARCHAR(255);
   L_store           SA_STORE_DAY.STORE%TYPE := I_store;
   L_day             SA_STORE_DAY.DAY%TYPE := I_day;

   cursor C_COUNT_ERRORS_ST is
      select COUNT(e.error_seq_no)
        from sa_error e
       where store_day_seq_no   = I_store_day_seq_no
         and store = L_store
         and day = L_day
         and store_override_ind = 'N';

   cursor C_COUNT_ERRORS_HQ is
      select COUNT(e.error_seq_no)
        from sa_error e
       where store_day_seq_no   = I_store_day_seq_no
         and store = L_store
         and day = L_day
         and hq_override_ind    = 'N';

   cursor C_COUNT_ERRORS_BAL_ST is
      select COUNT(e.error_seq_no)
        from sa_error e
       where e.store_override_ind = 'N'
         and e.store_day_seq_no = I_store_day_seq_no
         and e.store = L_store
         and e.day = L_day
         and e.bal_group_seq_no = I_bal_group_seq_no;

   cursor C_COUNT_ERRORS_BAL_HQ is
      select COUNT(e.error_seq_no)
        from sa_error e
       where e.hq_override_ind    = 'N'
         and e.store_day_seq_no = I_store_day_seq_no
         and e.store = L_store
         and e.day = L_day
         and e.bal_group_seq_no = I_bal_group_seq_no;


BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;
   ---
   O_error_count := 0;
   ---
   if I_emp_type = 'H' then
      if I_bal_group_seq_no is NULL then
         SQL_LIB.SET_MARK('OPEN','C_COUNT_ERRORS_HQ','SA_ERROR',NULL);
         open C_COUNT_ERRORS_HQ;
         SQL_LIB.SET_MARK('FETCH','C_COUNT_ERRORS_HQ','SA_ERROR',NULL);
         fetch C_COUNT_ERRORS_HQ into O_error_count;
         SQL_LIB.SET_MARK('CLOSE','C_COUNT_ERRORS_HQ','SA_ERROR',NULL);
         close C_COUNT_ERRORS_HQ;
      else
         SQL_LIB.SET_MARK('OPEN','C_COUNT_ERRORS_BAL_HQ','SA_ERROR',NULL);
         open C_COUNT_ERRORS_BAL_HQ;
         SQL_LIB.SET_MARK('FETCH','C_COUNT_ERRORS_BAL_HQ','SA_ERROR',NULL);
         fetch C_COUNT_ERRORS_BAL_HQ into O_error_count;
         SQL_LIB.SET_MARK('CLOSE','C_COUNT_ERRORS_BAL_HQ','SA_ERROR',NULL);
         close C_COUNT_ERRORS_BAL_HQ;
      end if;
   else
      if I_bal_group_seq_no is NULL then
         SQL_LIB.SET_MARK('OPEN','C_COUNT_ERRORS_ST','SA_ERROR',NULL);
         open C_COUNT_ERRORS_ST;
         SQL_LIB.SET_MARK('FETCH','C_COUNT_ERRORS_ST','SA_ERROR',NULL);
         fetch C_COUNT_ERRORS_ST into O_error_count;
         SQL_LIB.SET_MARK('CLOSE','C_COUNT_ERRORS_ST','SA_ERROR',NULL);
         close C_COUNT_ERRORS_ST;
      else
         SQL_LIB.SET_MARK('OPEN','C_COUNT_ERRORS_BAL_ST','SA_ERROR',NULL);
         open C_COUNT_ERRORS_BAL_ST;
         SQL_LIB.SET_MARK('FETCH','C_COUNT_ERRORS_BAL_ST','SA_ERROR',NULL);
         fetch C_COUNT_ERRORS_BAL_ST into O_error_count;
         SQL_LIB.SET_MARK('CLOSE','C_COUNT_ERRORS_BAL_ST','SA_ERROR',NULL);
         close C_COUNT_ERRORS_BAL_ST;
      end if;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_ERROR_COUNT;
-----------------------------------------------------------------
FUNCTION UPDATE_AUDIT_STATUS(O_error_message    IN OUT VARCHAR2,
                             I_store_day_seq_no IN     SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                             I_new_status       IN     SA_STORE_DAY.AUDIT_STATUS%TYPE,
                             I_store            IN     SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                             I_day              IN     SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program       VARCHAR2(60)  := 'STORE_DAY_SQL.UPDATE_AUDIT_STATUS';
   L_table         VARCHAR2(30) := 'SA_STORE_DAY';
   RECORD_LOCKED   EXCEPTION;
   PRAGMA          EXCEPTION_INIT(Record_Locked, -54);
   L_store         SA_STORE_DAY.STORE%TYPE := I_store;
   L_day           SA_STORE_DAY.DAY%TYPE := I_day;

   cursor C_LOCK_STORE_DAY is
      select 'x'
        from sa_store_day
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day
         for update nowait;
BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   else
      if L_store is NULL or L_day is NULL then
         if GET_INTERNAL_DAY(o_error_message,
                             L_store,
                             L_day,
                             I_store_day_seq_no,
                             NULL,
                             NULL,
                             NULL,
                             NULL) = FALSE then
            return FALSE;
         end if;
      end if;
      ---
      SQL_LIB.SET_MARK('OPEN','C_LOCK_STORE_DAY','SA_STORE_DAY',to_char(I_store_day_seq_no));
      open C_LOCK_STORE_DAY;
      SQL_LIB.SET_MARK('CLOSE','C_LOCK_STORE_DAY','SA_STORE_DAY',to_char(I_store_day_seq_no));
      close C_LOCK_STORE_DAY;
      ---
      SQL_LIB.SET_MARK('UPDATE',NULL,'SA_STORE_DAY','Store Day Seq: '
                                                    ||to_char(I_store_day_seq_no));
      update sa_store_day
         set audit_status           = I_new_status,
             audit_changed_datetime = SYSDATE
       where store_day_seq_no       = I_store_day_seq_no
         and store = L_store
         and day = L_day;
   end if;
   ---
   return TRUE;

EXCEPTION
   when RECORD_LOCKED then
      O_error_message := SQL_LIB.CREATE_MSG('TABLE_LOCKED',
                                            L_table,
                                            to_char(I_store_day_seq_no),
                                            NULL);
      return FALSE;
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END UPDATE_AUDIT_STATUS;
-------------------------------------------------------------------------------------------
FUNCTION GET_COUNT_INFO(O_error_message     IN OUT  VARCHAR2,
                        O_tran_count        IN OUT  NUMBER,
                        O_error_count       IN OUT  NUMBER,
                        O_os_value          IN OUT  SA_HQ_VALUE.HQ_VALUE%TYPE,
                        I_os_level          IN      VARCHAR2,
                        I_store_day_seq_no  IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                        I_bal_group_seq_no  IN      SA_BALANCE_GROUP.BAL_GROUP_SEQ_NO%TYPE,
				I_emp_type	  	  IN	    SA_EMPLOYEE.EMP_TYPE%TYPE,
                        I_store             IN      SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                        I_day               IN      SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program  VARCHAR2(60)  := 'STORE_DAY_SQL.GET_COUNT_INFO';
   L_store         SA_STORE_DAY.STORE%TYPE := I_store;
   L_day           SA_STORE_DAY.DAY%TYPE := I_day;

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;
   ---
   if GET_TRAN_COUNT(O_error_message,
                     O_tran_count,
                     I_store_day_seq_no,
                     I_bal_group_seq_no,
                     L_store,
                     L_day) = FALSE then
      return FALSE;
   end if;
   ---
   if GET_ERROR_COUNT(O_error_message,
                      O_error_count,
                      I_store_day_seq_no,
                      I_bal_group_seq_no,
			    I_emp_type,
                      L_store,
                      L_day) = FALSE then
      return FALSE;
   end if;
   ---
   if SA_TOTAL_SQL.GET_OS_VALUE(O_error_message,
                                O_os_value,
                                I_os_level,
                                I_store_day_seq_no,
                                I_bal_group_seq_no,
                                L_store,
                                L_day) = FALSE then
      return FALSE;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_COUNT_INFO;
-------------------------------------------------------------------------------------------
FUNCTION GET_STORE_DAY_SEQ(O_error_message     IN OUT  VARCHAR2,
                           O_store_day_seq_no  IN OUT  SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                           O_exists            IN OUT  BOOLEAN,
                           I_store             IN      STORE.STORE%TYPE,
                           I_business_date     IN      SA_STORE_DAY.BUSINESS_DATE%TYPE)
   RETURN BOOLEAN IS

   L_program  VARCHAR2(60)  := 'STORE_DAY_SQL.GET_STORE_DAY_SEQ';

   cursor C_GET_SEQ_NO is
      select store_day_seq_no
        from sa_store_day
       where store         = I_store
         and business_date = I_business_date;
BEGIN
   if I_store is NULL or I_business_date is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   O_exists := TRUE;
   ---
   SQL_LIB.SET_MARK('OPEN','C_GET_SEQ_NO','SA_STORE_DAY','Store: '||to_char(I_store)||
                                          ', Business date: '||to_char(I_business_date));
   open C_GET_SEQ_NO;
   SQL_LIB.SET_MARK('FETCH','C_GET_SEQ_NO','SA_STORE_DAY','Store: '||to_char(I_store)||
                                           ', Business date: '||to_char(I_business_date));
   fetch C_GET_SEQ_NO into O_store_day_seq_no;
   SQL_LIB.SET_MARK('CLOSE','C_GET_SEQ_NO','SA_STORE_DAY','Store: '||to_char(I_store)||
                                            ', Business date: '||to_char(I_business_date));
   close C_GET_SEQ_NO;
   ---
   if O_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('STORE_BUS_DATE_INVALID',
                                            NULL,
                                            NULL,
                                            NULL);
      O_exists := FALSE;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_STORE_DAY_SEQ;
-----------------------------------------------------------------
FUNCTION GET_AUDIT_STATUS(O_error_message     IN OUT  VARCHAR2,
                          O_audit_status      IN OUT  SA_STORE_DAY.AUDIT_STATUS%TYPE,
                          I_store_day_seq_no  IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                          I_store             IN      SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                          I_day               IN      SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program VARCHAR2(60)  := 'STORE_DAY_SQL.GET_AUDIT_STATUS';
   L_store         SA_STORE_DAY.STORE%TYPE := I_store;
   L_day           SA_STORE_DAY.DAY%TYPE := I_day;

   cursor C_GET_AUDIT_STATUS is
      select audit_status
        from sa_store_day
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day;

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;
   ---
   SQL_LIB.SET_MARK('OPEN','C_GET_AUDIT_STATUS','SA_STORE_DAY',
                           'store day seq no: '||to_char(I_store_day_seq_no));
   open C_GET_AUDIT_STATUS;
   SQL_LIB.SET_MARK('FETCH','C_GET_AUDIT_STATUS','SA_STORE_DAY',
                            'store day seq no: '||to_char(I_store_day_seq_no));
   fetch C_GET_AUDIT_STATUS into O_audit_status;
   SQL_LIB.SET_MARK('CLOSE','C_GET_AUDIT_STATUS','SA_STORE_DAY',
                            'store day seq no: '||to_char(I_store_day_seq_no));
   close C_GET_AUDIT_STATUS;
   ---
   if O_audit_status is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('AUDIT_STATUS_NOT_FOUND',
                                            NULL,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_AUDIT_STATUS;
-----------------------------------------------------------------
FUNCTION GET_DATA_STATUS(O_error_message     IN OUT  VARCHAR2,
                         O_data_status       IN OUT  SA_STORE_DAY.DATA_STATUS%TYPE,
                         I_store_day_seq_no  IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                         I_store             IN      SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                         I_day               IN      SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program VARCHAR2(60)  := 'STORE_DAY_SQL.GET_DATA_STATUS';
   L_store         SA_STORE_DAY.STORE%TYPE := I_store;
   L_day           SA_STORE_DAY.DAY%TYPE := I_day;

   cursor C_GET_DATA_STATUS is
      select data_status
        from sa_store_day
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day;

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;
   ---
   SQL_LIB.SET_MARK('OPEN','C_GET_DATA_STATUS','SA_STORE_DAY',
                           'store day seq no: '||to_char(I_store_day_seq_no));
   open C_GET_DATA_STATUS;
   SQL_LIB.SET_MARK('FETCH','C_GET_DATA_STATUS','SA_STORE_DAY',
                            'store day seq no: '||to_char(I_store_day_seq_no));
   fetch C_GET_DATA_STATUS into O_data_status;
   SQL_LIB.SET_MARK('CLOSE','C_GET_DATA_STATUS','SA_STORE_DAY',
                            'store day seq no: '||to_char(I_store_day_seq_no));
   close C_GET_DATA_STATUS;
   ---
   if O_data_status is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('DATA_STATUS_NOT_FOUND',
                                            NULL,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_DATA_STATUS;
----------------------------------------------------------------------------------------
FUNCTION UPDATE_DATA_STATUS(O_error_message     IN OUT  VARCHAR2,
                            I_store_day_seq_no  IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                            I_new_data_status   IN      SA_STORE_DAY.DATA_STATUS%TYPE,
                            I_store             IN      SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                            I_day               IN      SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program       VARCHAR2(60)  := 'STORE_DAY_SQL.UPDATE_DATA_STATUS';
   L_table         VARCHAR2(30) := 'SA_STORE_DAY';
   RECORD_LOCKED   EXCEPTION;
   PRAGMA          EXCEPTION_INIT(Record_Locked, -54);
   L_store         SA_STORE_DAY.STORE%TYPE := I_store;
   L_day           SA_STORE_DAY.DAY%TYPE := I_day;
   L_mla_store_ind VARCHAR2(1) := 'N';   

   cursor C_LOCK_STORE_DAY is
      select 'x'
        from sa_store_day
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day
         for update nowait;
BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   else
      if L_store is NULL or L_day is NULL then
         if GET_INTERNAL_DAY(o_error_message,
                             L_store,
                             L_day,
                             I_store_day_seq_no,
                             NULL,
                             NULL,
                             NULL,
                             NULL) = FALSE then
            return FALSE;
         end if;
      end if;
      if STORE_DATA_SQL.CHECK_MLA_STORE(o_error_message,
                                        L_mla_store_ind,
                                        L_store) = FALSE then
         return FALSE;
      end if;
      ---
      SQL_LIB.SET_MARK('OPEN','C_LOCK_STORE_DAY','SA_STORE_DAY',to_char(I_store_day_seq_no));
      open C_LOCK_STORE_DAY;
      SQL_LIB.SET_MARK('CLOSE','C_LOCK_STORE_DAY','SA_STORE_DAY',to_char(I_store_day_seq_no));
      close C_LOCK_STORE_DAY;
      ---
      SQL_LIB.SET_MARK('UPDATE',NULL,'SA_STORE_DAY',
                                     'Store Day Seq No.: '||to_char(I_store_day_seq_no));
      update sa_store_day
         set data_status      = I_new_data_status
       where store_day_seq_no = I_store_day_seq_no
         and store            = L_store
         and day              = L_day;
      if L_mla_store_ind = 'N' and I_new_data_status = 'F' then
         update sa_store_day
           set store_status     = 'C',
               audit_status     = 'R',
               audit_changed_datetime = SYSDATE
         where store_day_seq_no = I_store_day_seq_no
           and store            = L_store
           and day              = L_day;
      end if;
   end if;
   ---
   return TRUE;

EXCEPTION
   when RECORD_LOCKED then
      O_error_message := SQL_LIB.CREATE_MSG('TABLE_LOCKED',
                                            L_table,
                                            to_char(I_store_day_seq_no),
                                            NULL);
      return FALSE;
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END UPDATE_DATA_STATUS;
----------------------------------------------------------------------------
FUNCTION GET_STORE_STATUS(O_error_message     IN OUT  VARCHAR2,
                          O_store_status      IN OUT  SA_STORE_DAY.STORE_STATUS%TYPE,
                          I_store_day_seq_no  IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                          I_store             IN      SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                          I_day               IN      SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program VARCHAR2(60)  := 'STORE_DAY_SQL.GET_STORE_STATUS';

   cursor C_GET_STORE_STATUS is
      select store_status
        from sa_store_day
       where store_day_seq_no = I_store_day_seq_no
         and (store = I_store or I_store is NULL)
         and (day = I_day or I_day is NULL);

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   SQL_LIB.SET_MARK('OPEN','C_GET_STORE_STATUS','SA_STORE_DAY',
                           'store day seq no: '||to_char(I_store_day_seq_no));
   open C_GET_STORE_STATUS;
   SQL_LIB.SET_MARK('FETCH','C_GET_STORE_STATUS','SA_STORE_DAY',
                            'store day seq no: '||to_char(I_store_day_seq_no));
   fetch C_GET_STORE_STATUS into O_store_status;
   SQL_LIB.SET_MARK('CLOSE','C_GET_STORE_STATUS','SA_STORE_DAY',
                            'store day seq no: '||to_char(I_store_day_seq_no));
   close C_GET_STORE_STATUS;
   ---
   if O_store_status is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('STORE_STATUS_NOT_FOUND',
                                            NULL,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_STORE_STATUS;
----------------------------------------------------------------------------------------
FUNCTION UPDATE_STORE_FUEL_STATUS(O_error_message IN OUT VARCHAR2,
                                  I_store         IN     STORE.STORE%TYPE,
                                  I_business_date IN     SA_STORE_DAY.BUSINESS_DATE%TYPE)
   RETURN BOOLEAN IS

   L_program       VARCHAR2(60) := 'STORE_DAY_SQL.UPDATE_STORE_FUEL_STATUS';
   L_table         VARCHAR2(30) := 'SA_STORE_DAY';
   RECORD_LOCKED   EXCEPTION;
   PRAGMA          EXCEPTION_INIT(Record_Locked, -54);

   cursor C_LOCK_STORE_DAY is
      select 'x'
        from sa_store_day
       where store         = I_store
         and business_date = I_business_date
         for update nowait;
BEGIN
   if I_store is NULL or I_business_date is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   else
      SQL_LIB.SET_MARK('OPEN','C_LOCK_STORE_DAY','SA_STORE_DAY','Store: '||to_char(I_store)||
                                                                ' Business Date: '||to_char(I_business_date));
      open C_LOCK_STORE_DAY;
      SQL_LIB.SET_MARK('CLOSE','C_LOCK_STORE_DAY','SA_STORE_DAY','Store: '||to_char(I_store)||
                                                                ' Business Date: '||to_char(I_business_date));
      close C_LOCK_STORE_DAY;
      ---
      SQL_LIB.SET_MARK('UPDATE',NULL,'SA_STORE_DAY','Store: '||to_char(I_store)||
                                                                ' Business Date: '||to_char(I_business_date));
      update sa_store_day
         set store_status  = DECODE(data_status,'F','C','F')
       where store         = I_store
         and business_date = I_business_date;
   end if;
   ---
   return TRUE;

EXCEPTION
   when RECORD_LOCKED then
      O_error_message := SQL_LIB.CREATE_MSG('TABLE_LOCKED',
                                            L_table,
                                            to_char(I_store),
                                            to_char(I_business_date));
      return FALSE;
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END UPDATE_STORE_FUEL_STATUS;
------------------------------------------------------------------------------
FUNCTION GET_INTEGRATED_POS_IND(O_error_message      IN OUT VARCHAR2,
                                O_integrated_pos_ind IN OUT STORE.INTEGRATED_POS_IND%TYPE,
                                I_store              IN     STORE.STORE%TYPE)
   RETURN BOOLEAN IS

   L_program VARCHAR2(60)  := 'STORE_DAY_SQL.GET_INTEGRATED_POS_IND';

   cursor C_GET_IND is
      select integrated_pos_ind
        from store
       where store = I_store;

BEGIN
   if I_store is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   SQL_LIB.SET_MARK('OPEN','C_GET_IND','STORE','Store: '||to_char(I_store));
   open C_GET_IND;
   SQL_LIB.SET_MARK('FETCH','C_GET_IND','STORE','Store: '||to_char(I_store));
   fetch C_GET_IND into O_integrated_pos_ind;
   SQL_LIB.SET_MARK('CLOSE','C_GET_IND','STORE','Store: '||to_char(I_store));
   close C_GET_IND;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_INTEGRATED_POS_IND;
--------------------------------------------------------------------
FUNCTION DELETE_STORE_DAY(O_error_message    IN OUT VARCHAR2,
                          I_store_day_seq_no IN     SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                          I_store            IN     SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                          I_day              IN     SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program       VARCHAR2(60)  := 'STORE_DAY_SQL.DELETE_STORE_DAY';
   L_table         VARCHAR2(30)  := 'SA_TRAN_HEAD';
   RECORD_LOCKED   EXCEPTION;
   PRAGMA          EXCEPTION_INIT(Record_Locked, -54);
   L_store         SA_STORE_DAY.STORE%TYPE := I_store;
   L_day           SA_STORE_DAY.DAY%TYPE := I_day;

   cursor C_LOCK_TRAN_HEAD is
      select 'x'
        from sa_tran_head
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day
         for update nowait;

   cursor C_LOCK_TOTAL is
      select 'x'
        from sa_total
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day
         for update nowait;

   cursor C_LOCK_IMPORT_LOG is
      select 'x'
        from sa_import_log
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day
         and system_code in ('POS','MLA')
         for update nowait;

   cursor C_GET_EXP_SYSTEM_CODE is
      select el.system_code, el.seq_no
        from sa_export_log el
       where el.store_day_seq_no = I_store_day_seq_no
         and el.store = L_store
         and el.day = L_day
         and el.status = 'E'
         and el.system_code IN
            (select system_code
               from sa_export_options
              where multiple_exp_ind = 'Y')
         and el.seq_no = (select max(el2.seq_no)
                         from sa_export_log el2
                        where el2.system_code = el.system_code
                          and el2.store_day_seq_no = el.store_day_seq_no
                          and el2.store = el.store
                          and el2.day = el.day);

   R_GET_EXP_SYSTEM_CODE     C_GET_EXP_SYSTEM_CODE%ROWTYPE;

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;
   ---
   SQL_LIB.SET_MARK('OPEN','C_LOCK_TRAN_HEAD','SA_TRAN_HEAD',
                           'Store Day Seq No: '||to_char(I_store_day_seq_no));
   open C_LOCK_TRAN_HEAD;
   SQL_LIB.SET_MARK('CLOSE','C_LOCK_TRAN_HEAD','SA_TRAN_HEAD',
                            'Store Day Seq No: '||to_char(I_store_day_seq_no));
   close C_LOCK_TRAN_HEAD;
   ---
   SQL_LIB.SET_MARK('UPDATE',NULL,'SA_TRAN_HEAD',
                                  'Store Day Seq No: '||to_char(I_store_day_seq_no));
   update sa_tran_head
      set status           = 'D'
    where store_day_seq_no = I_store_day_seq_no
      and store = L_store
      and day = L_day;
   ---
   SQL_LIB.SET_MARK('OPEN','C_LOCK_TOTAL','SA_TOTAL',
                           'Store Day Seq No: '||to_char(I_store_day_seq_no));
   open C_LOCK_TOTAL;
   SQL_LIB.SET_MARK('CLOSE','C_LOCK_TOTAL','SA_TOTAL',
                            'Store Day Seq No: '||to_char(I_store_day_seq_no));
   close C_LOCK_TOTAL;
   ---

   SQL_LIB.SET_MARK('UPDATE',NULL,'SA_TOTAL',
                                  'Store Day Seq No: '||to_char(I_store_day_seq_no));
   update sa_total
      set status           = 'D'
    where store_day_seq_no = I_store_day_seq_no
      and store = L_store
      and day = L_day;
   ---
   SQL_LIB.SET_MARK('OPEN','C_LOCK_IMPORT_LOG','SA_IMPORT_LOG',NULL);
   open C_LOCK_IMPORT_LOG;
   SQL_LIB.SET_MARK('CLOSE','C_LOCK_IMPORT_LOG','SA_IMPORT_LOG',NULL);
   close C_LOCK_IMPORT_LOG;
   ---
   SQL_LIB.SET_MARK('UPDATE',NULL,'SA_IMPORT_LOG',NULL);
   update sa_import_log
      set status = 'R',
          datetime = SYSDATE
    where store_day_seq_no = I_store_day_seq_no
      and store = L_store
      and day = L_day
      and system_code in ('POS','MLA');

   ---
   FOR R_GET_EXP_SYSTEM_CODE IN C_GET_EXP_SYSTEM_CODE
   LOOP
      SQL_LIB.SET_MARK('INSERT',NULL,'SA_EXPORT_LOG',NULL);
      INSERT INTO sa_export_log (store,
                                 day,
                                 store_day_seq_no,
                                 system_code,
                                 seq_no,
                                 status,
                                 datetime)
                         Values (L_store,
                                 L_day,
                                 I_store_day_seq_no,
                                 R_GET_EXP_SYSTEM_CODE.system_code,
                                 R_GET_EXP_SYSTEM_CODE.seq_no + 1,
                                 'R',
                                 NULL);
   END LOOP;
   ---
   SQL_LIB.SET_MARK('DELETE',NULL,'SA_ERROR_REV',NULL);
   delete from sa_error_rev
         where store_day_seq_no = I_store_day_seq_no
           and store = L_store
           and day = L_day;
   ---
   SQL_LIB.SET_MARK('UPDATE',NULL,'SA_FLASH_SALES',NULL);
   update sa_flash_sales
      set weather = NULL,
          temperature = NULL,
          net_sales = 0,
          net_sales_suspended = 0
    where (store, business_date) =
             (select store, business_date
                from sa_store_day
               where store_day_seq_no = I_store_day_seq_no
                 and store = L_store
                 and day = L_day);
   ---
   SQL_LIB.SET_MARK('UPDATE',NULL,'SA_STORE_DAY',NULL);
   update sa_store_day
      set audit_status = 'U',
          data_status  = 'R',
          files_loaded = 0,
          audit_changed_datetime = SYSDATE
    where store_day_seq_no = I_store_day_seq_no
      and store = L_store
      and day = L_day;
   ---
   SQL_LIB.SET_MARK('DELETE',NULL,'SA_ERROR','Store Day Seq No: '||to_char(I_store_day_seq_no));
   delete from sa_error
    where store_day_seq_no = I_store_day_seq_no
      and store = L_store
      and day = L_day;
   ---
   return TRUE;

EXCEPTION
   when RECORD_LOCKED then
      O_error_message := SQL_LIB.CREATE_MSG('TABLE_LOCKED',
                                            L_table,
                                            to_char(I_store_day_seq_no),
                                            NULL);
      return FALSE;
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END DELETE_STORE_DAY;
-------------------------------------------------------------------------------------------
FUNCTION TOTAL_AUDIT(O_error_message    IN OUT VARCHAR2,
                     I_store_day_seq_no IN     SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                     I_user_id          IN     SA_EMPLOYEE.USER_ID%TYPE,
                     I_pos_totals_ind   IN     VARCHAR2,
                     I_store            IN     SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                     I_day              IN     SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program              VARCHAR2(60) := 'STORE_DAY_SQL.TOTAL_AUDIT';
   L_audit_after_imp_ind  SA_SYSTEM_OPTIONS.AUDIT_AFTER_IMP_IND%TYPE;
   L_data_status          SA_STORE_DAY.DATA_STATUS%TYPE;
   L_pos_totals_ind       VARCHAR2(1);
   L_store                SA_STORE_DAY.STORE%TYPE := I_store;
   L_day                  SA_STORE_DAY.DAY%TYPE := I_day;

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
      if STORE_DAY_SQL.GET_DATA_STATUS(O_error_message,
                                       L_data_status,
                                       I_store_day_seq_no) = FALSE then
         return FALSE;
      end if;
      if L_audit_after_imp_ind = 'N' and L_data_status = 'P' then
         /* Execute the POS totaling process since the data status is not fully loaded and the import
            processes to not total/audit unless the data status is fully loaded with the given system
            option. */
         L_pos_totals_ind := 'Y';
      else
         L_pos_totals_ind := 'N';
      end if;
   else
      L_pos_totals_ind := I_pos_totals_ind;
   end if;
   ---
   if SA_BUILD_TOTAL_SQL.PROCESS_CALC_TOTALS(O_error_message,
                                             I_store_day_seq_no,
                                             L_pos_totals_ind,
                                             L_store,
                                             L_day) = FALSE then
      return FALSE;
   end if;
   ---
   if SA_AUDIT_RULES_SQL.PROCESS_AUDIT_RULES(O_error_message,
                                             I_store_day_seq_no,
                                             I_user_id,
                                             L_store,
                                             L_day) = FALSE then
      return FALSE;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END TOTAL_AUDIT;
-------------------------------------------------------------------------------------------
FUNCTION STATUS_FIX(O_error_message        IN OUT VARCHAR2,
                    I_user_id              IN OUT SA_EMPLOYEE.USER_ID%TYPE,
                    I_store_day_seq_no     IN     SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                    I_store                IN     SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                    I_day                  IN     SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
RETURN BOOLEAN IS
   L_program VARCHAR2(60)  := 'STORE_DAY_SQL.GET_STATUS_CHANGE';
   L_emp_type           SA_EMPLOYEE.EMP_TYPE%TYPE;
   L_cashier_ind        SA_EMPLOYEE.CASHIER_IND%TYPE;
   L_name               SA_EMPLOYEE.NAME%TYPE;
   L_emp_id             SA_EMPLOYEE.EMP_ID%TYPE;
   L_update_to          SA_STORE_DAY.AUDIT_STATUS%TYPE;
   L_audit_status       SA_STORE_DAY.AUDIT_STATUS%TYPE;
   L_store              SA_STORE_DAY.STORE%TYPE := I_store;
   L_day                SA_STORE_DAY.DAY%TYPE := I_day;

   cursor C_GET_STORE_OVERRIDE is
      select store_override_ind
        from sa_error
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day;

   cursor C_GET_HQ_OVERRIDE is
      select hq_override_ind
        from sa_error
       where store_day_seq_no = I_store_day_seq_no
         and store = L_store
         and day = L_day;

BEGIN
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;

   if not SA_EMPLOYEE_SQL.GET_EMP_INFO(O_error_message,
  	                                 L_emp_type,
  	                                 L_cashier_ind,
  	                                 L_name,
  	                                 I_user_id,
  	                                 L_emp_id) then
      return FALSE;
   end if;
   if not STORE_DAY_SQL.GET_AUDIT_STATUS(O_error_message,
   	                                   L_audit_status,
   	                                   I_store_day_seq_no,
                                         L_store,
                                         L_day) then
   	return FALSE;
   end if;
   ---
   if L_emp_type = 'S' and L_audit_status = 'S' then
      FOR rec IN C_GET_STORE_OVERRIDE LOOP
         if C_GET_STORE_OVERRIDE%NOTFOUND then
            Exit;
         end if;
         ---
         if rec.store_override_ind = 'N' then
            return TRUE;
         end if;
      END LOOP;
      ---
      if not STORE_DAY_SQL.UPDATE_AUDIT_STATUS(O_error_message,
                                               I_store_day_seq_no,
                                               'H',
                                               L_store,
                                               L_day) then
         return FALSE;
      end if;

   elsif L_emp_type = 'H' and L_audit_status = 'H' then
      FOR rec IN C_GET_HQ_OVERRIDE LOOP
         if C_GET_HQ_OVERRIDE%NOTFOUND then
            Exit;
         end if;
         ---
         if rec.hq_override_ind = 'N' then
            return TRUE;
         end if;
      END LOOP;
      ---
      if not STORE_DAY_SQL.UPDATE_AUDIT_STATUS(O_error_message,
                                               I_store_day_seq_no,
                                               'A',
                                               L_store,
                                               L_day) then
         return FALSE;
      end if;
   end if;

   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END STATUS_FIX;
---------------------------------------------------------------------
-- This function should only be active if the system uses Site Fuel Management.
/* FUNCTION PERFORM_SFM_FULL_CLOSE(O_error_message  IN OUT  VARCHAR2,
		                I_store_day_seq_no IN    SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                                I_store            IN    SA_STORE_DAY.STORE%TYPE,
                                I_business_date    IN    SA_STORE_DAY.BUSINESS_DATE%TYPE)
   RETURN BOOLEAN IS
   ---
   L_program       VARCHAR2(64) := 'STORE_DAY_SQL.PERFORM_SFM_FULL_CLOSE';
   L_store_day     EAS_PUBLIC_UTILITIES.CLOSE_STOCK_PERIOD_REC_TYPE;
   L_message_count NUMBER;
   L_message_data  EAS_PUBLIC_UTILITIES.MESSAGE_TABLE_TYPE;
   L_return_status VARCHAR2(1);
   ---
BEGIN
   if I_store is NULL or I_business_date is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_INPUT_GENERIC',
                                            NULL,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   L_store_day.retail_site_code := I_store;
   L_store_day.business_day     := I_business_date;
   EAS_PERIOD_PUB.PERFORM_FULL_CLOSE(1.0,             --- version number
                                     L_return_status, --- either E, U, S (Errors, Unexpected, Success)
                                     L_message_count,
                                     L_message_data,
                                     L_store_day,
                                     FALSE);          --- SFM manage rollback
   if L_return_status != 'S' then
      O_error_message := SQL_LIB.CREATE_MSG('SFM_CLOSE_FAIL',
                                            NULL,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   return TRUE;
EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END PERFORM_SFM_FULL_CLOSE; */
-------------------------------------------------------------------------------------------
FUNCTION UPDATE_TOTAL_AUDIT(O_error_message        IN OUT VARCHAR2,
                            O_locked_list          IN OUT VARCHAR2,
                            O_locked_count         IN OUT NUMBER,
                            O_success_list         IN OUT VARCHAR2,
                            O_success_count        IN OUT NUMBER,
                            I_user_id              IN     SA_EMPLOYEE.USER_ID%TYPE,
                            I_rule_id              IN     SA_RULE_HEAD.RULE_ID%TYPE,
                            I_total_id             IN     SA_TOTAL_HEAD.TOTAL_ID%TYPE,
                            I_rev_no               IN     SA_TOTAL_HEAD.TOTAL_REV_NO%TYPE,
                            I_run_total_audit_ind  IN     VARCHAR2,
                            I_update_datetime      IN     SA_STORE_DAY.AUDIT_CHANGED_DATETIME%TYPE)
   RETURN BOOLEAN IS
   ---
   L_program                 VARCHAR2(60) := 'STORE_DAY_SQL.UPDATE_TOTAL_AUDIT';
   L_start_date              VARCHAR2(8);
   L_end_date                VARCHAR2(8);
   L_store_day_seq_no        SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE;
   L_store                   SA_STORE_DAY.STORE%TYPE;
   L_day                     NUMBER := 0;
   L_business_date           VARCHAR2(12);
   L_audit_status            SA_STORE_DAY.AUDIT_STATUS%TYPE;
   L_locked_count            NUMBER := 0;
   L_success_count           NUMBER := 0;
   L_max_locked_len          NUMBER := 1000;
   L_max_success_len         NUMBER := 1000;
 ---
   cursor C_GET_TOTAL_DATE_RANGE is
      select to_char(start_business_date, 'YYYYMMDD'),
             to_char(end_business_date, 'YYYYMMDD')
        from sa_total_head
       where total_id     = I_total_id
         and total_rev_no = I_rev_no;
   ---
   cursor C_GET_RULE_DATE_RANGE is
      select to_char(start_business_date, 'YYYYMMDD'),
             to_char(end_business_date, 'YYYYMMDD')
        from sa_rule_head
       where rule_id     = I_rule_id
         and rule_rev_no = I_rev_no;
   ---
   cursor C_GET_STORE_DAY_INFO is
      select store_day_seq_no,
             to_char(store),
             day,
             to_char(business_date, 'DD-MM-YYYY'),
             audit_status
        from sa_store_day
       where (
                (to_char(business_date, 'YYYYMMDD') between L_start_date and L_end_date
                 and L_end_date is NOT NULL)
              or(to_char(business_date, 'YYYYMMDD') >= L_start_date
                 and L_end_date is NULL)
             )
         and store in (select distinct m.store
                         from loc_traits_matrix m
                        where m.loc_trait in (select r.loc_trait
                                                from sa_rule_loc_trait r
                                               where r.rule_id     = I_rule_id
                                                 and I_rule_id is NOT NULL
                                                 and r.rule_rev_no = I_rev_no)
                           or m.loc_trait in (select t.loc_trait
                                                from sa_total_loc_trait t
                                               where t.total_id       = I_total_id
                                                 and I_total_id is NOT NULL
                                                 and t.total_rev_no   = I_rev_no))
         and (   (audit_status in ('S', 'H', 'T', 'A') and I_run_total_audit_ind = 'N')
              or (audit_status in ('S', 'H', 'T', 'A', 'R') and I_run_total_audit_ind = 'Y')
             )
         and data_status in ('F', 'P')
         and audit_changed_datetime < I_update_datetime;
BEGIN
   if (I_rule_id is NULL and I_total_id is NULL) or
         (I_rule_id is NOT NULL and I_total_id is NOT NULL) or
         I_user_id is NULL or
         I_rev_no  is NULL or
         I_run_total_audit_ind is NULL or
         I_update_datetime is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   O_locked_count  := 0;
   O_success_count := 0;
   ---
   if I_rule_id is NOT NULL then
      SQL_LIB.SET_MARK('OPEN','C_GET_RULE_DATE_RANGE','SA_RULE_HEAD',NULL);
      open  C_GET_RULE_DATE_RANGE;
      SQL_LIB.SET_MARK('FETCH','C_GET_RULE_DATE_RANGE','SA_RULE_HEAD',NULL);
      fetch C_GET_RULE_DATE_RANGE into L_start_date,
                                       L_end_date;
      SQL_LIB.SET_MARK('CLOSE','C_GET_RULE_DATE_RANGE','SA_RULE_HEAD',NULL);
      close C_GET_RULE_DATE_RANGE;
   else --- I_total_id is NOT NULL
      SQL_LIB.SET_MARK('OPEN','C_GET_TOTAL_DATE_RANGE','SA_TOTAL_HEAD',NULL);
      open  C_GET_TOTAL_DATE_RANGE;
      SQL_LIB.SET_MARK('FETCH','C_GET_TOTAL_DATE_RANGE','SA_TOTAL_HEAD',NULL);
      fetch C_GET_TOTAL_DATE_RANGE into L_start_date,
                                        L_end_date;
      SQL_LIB.SET_MARK('CLOSE','C_GET_TOTAL_DATE_RANGE','SA_TOTAL_HEAD',NULL);
      close C_GET_TOTAL_DATE_RANGE;
   end if;
   ---
   SQL_LIB.SET_MARK('OPEN','C_GET_STORE_DAY_INFO','SA_STORE_DAY',NULL);
   open  C_GET_STORE_DAY_INFO;
   LOOP
      SQL_LIB.SET_MARK('FETCH','C_GET_STORE_DAY_INFO','SA_STORE_DAY',NULL);
      fetch C_GET_STORE_DAY_INFO into L_store_day_seq_no,
                                        L_store,
                                        L_day,
                                        L_business_date,
                                        L_audit_status;
      EXIT when C_GET_STORE_DAY_INFO%NOTFOUND;
      BEGIN
         --- Check for and lock the store/day.
         if SA_LOCKING_SQL.GET_WRITE_LOCK(O_error_message,
      	                                  L_store_day_seq_no) = FALSE then
            if O_locked_list is NULL then
               O_locked_list := L_store || '/' || L_business_date;
            else
               -- restrict the length not to grow beyond the max. length of list
               if ( length(O_locked_list) + 20 ) < L_max_locked_len then
                  O_locked_list := O_locked_list || ', ' || L_store || '/' || L_business_date;
               end if;
            end if;
            O_locked_count := O_locked_count + 1;
         else
            --- Update the audit status to Re-Totaling/Auditing Required.
            if L_audit_status NOT in ('R', 'U') then
               if STORE_DAY_SQL.UPDATE_AUDIT_STATUS(O_error_message,
                                                    L_store_day_seq_no,
                                                    'R',
                                                    to_number(L_store),
                                                    L_day) = FALSE then
                  return FALSE;
               end if;
            end if;
            ---
            if I_run_total_audit_ind = 'Y' then
               --- Run the Totaling and Auditing Process.
               if SA_BUILD_TOTAL_SQL.PROCESS_CALC_TOTALS(O_error_message,
                                                         L_store_day_seq_no,
                                                         'N',
                                                         L_store,
                                                         L_day) = FALSE then
                  return FALSE;
               end if;
               ---
               if SA_AUDIT_RULES_SQL.PROCESS_AUDIT_RULES(O_error_message,
                                                         L_store_day_seq_no,
                                                         I_user_id,
                                                         to_number(L_store),
                                                         L_day) = FALSE then
                  return FALSE;
               end if;
            end if;
            ---
            if O_success_list is NULL then
               O_success_list := L_store || '/' || L_business_date;
            else
               -- restrict the length not to grow beyond the max. length of list
               if ( length(O_success_list) + 20 ) < L_max_success_len then
                  O_success_list := O_success_list || ', ' || L_store || '/' || L_business_date;
               end if;
            end if;
            O_success_count := O_success_count + 1;
         end if;
      END;
   end LOOP;
   SQL_LIB.SET_MARK('CLOSE','C_GET_STORE_DAY_INFO','SA_STORE_DAY',NULL);
   close C_GET_STORE_DAY_INFO;
   ---
   return TRUE;
   ---
EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END UPDATE_TOTAL_AUDIT;
-------------------------------------------------------------------------------------------
FUNCTION GET_ERROR_COUNT_STATUS(O_error_message     IN OUT   VARCHAR2,
                                O_error_count       IN OUT   NUMBER,
                                I_store_day_seq_no  IN       SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                                I_bal_group_seq_no  IN       SA_BALANCE_GROUP.BAL_GROUP_SEQ_NO%TYPE,
                                I_emp_type          IN       SA_EMPLOYEE.EMP_TYPE%TYPE,
                                I_error_status      IN       V_SA_ERROR_ALL.STATUS%TYPE,
                                I_store             IN       SA_STORE_DAY.STORE%TYPE DEFAULT NULL,
                                I_day               IN       SA_STORE_DAY.DAY%TYPE DEFAULT NULL)
   RETURN BOOLEAN IS

   L_program       VARCHAR2(60)   := 'STORE_DAY_SQL.GET_ERROR_COUNT';
   L_error_message VARCHAR(255);
   L_store         SA_STORE_DAY.STORE%TYPE := I_store;
   L_day           SA_STORE_DAY.DAY%TYPE := I_day; 

   cursor C_COUNT_ERRORS is
   select COUNT(e.error_seq_no)
     from v_sa_error_all e
    where store_day_seq_no = I_store_day_seq_no
      and (store = I_store or I_store is NULL)
      and (day = I_day or I_day is NULL)
      and ((I_emp_type = 'H' and hq_override_ind = 'N') or (I_emp_type = 'S' and store_override_ind = 'N'))
      and ((I_bal_group_seq_no is NOT NULL and e.bal_group_seq_no = I_bal_group_seq_no) or I_bal_group_seq_no is NULL)
      and ((I_error_status = 'W' and e.status = 'W') or I_error_status = 'B');


BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;
   ---
   if I_emp_type is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if (I_error_status is NULL) or (I_error_status not in ('B', 'W')) then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   O_error_count := 0;
   ---
   SQL_LIB.SET_MARK('OPEN','C_COUNT_ERRORS','V_SA_ERROR_ALL',NULL);
   open C_COUNT_ERRORS;
   SQL_LIB.SET_MARK('FETCH','C_COUNT_ERRORS','V_SA_ERROR_ALL',NULL);
   fetch C_COUNT_ERRORS into O_error_count;
   SQL_LIB.SET_MARK('CLOSE','C_COUNT_ERRORS','V_SA_ERROR_ALL',NULL);
   close C_COUNT_ERRORS;

   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_ERROR_COUNT_STATUS;
-------------------------------------------------------------------------------------------
FUNCTION GET_LOCATION_INFO(O_error_message      IN OUT  VARCHAR2,
                           O_store              IN OUT  SA_STORE_DAY.STORE%TYPE,
                           O_store_name         IN OUT  STORE.STORE_NAME%TYPE,
                           O_chain              IN OUT  SA_STORE_DAY.STORE%TYPE,
                           O_chain_name         IN OUT  STORE.STORE_NAME%TYPE,
                           I_store_day_seq_no   IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE)
   RETURN BOOLEAN IS

   L_program  VARCHAR2(64) := 'STORE_DAY_SQL.GET_LOCATION_INFO';

    cursor C_GET_STORE is
      select store
        from sa_store_day
       where store_day_seq_no = I_store_day_seq_no;

   cursor C_GET_CHAIN(C_store STORE.STORE%TYPE) is
      select ar.chain
        from area ar,
             region re,
             district di,
             store st
       where ar.area     = re.area
         and re.region   = di.region
         and di.district = st.district
         and st.store    = C_store;

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   --- Get Store
   SQL_LIB.SET_MARK('OPEN','C_GET_STORE','SA_STORE_DAY',
                    'Store Day Seq No.: '||to_char(I_store_day_seq_no));
   open C_GET_STORE;
   SQL_LIB.SET_MARK('FETCH','C_GET_STORE','SA_STORE_DAY',
                    'Store Day Seq No.: '||to_char(I_store_day_seq_no));
   fetch C_GET_STORE into O_store;
   SQL_LIB.SET_MARK('CLOSE','C_GET_STORE','SA_STORE_DAY',
                    'Store Day Seq No.: '||to_char(I_store_day_seq_no));
   close C_GET_STORE;
   if O_store is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('STORE_DAY_NOT_FOUND',
                                            NULL,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   --- Get Store Name
   if STORE_ATTRIB_SQL.GET_NAME(O_error_message,
                                O_store,
                                O_store_name) = FALSE then
      return FALSE;
   end if;
   ---
   --- Get Chain
   SQL_LIB.SET_MARK('OPEN','C_GET_CHAIN','AREA, REGION, DISTRICT, STORE',
                    'Store: '||to_char(O_store));
   open C_GET_CHAIN(O_store);
   SQL_LIB.SET_MARK('FETCH','C_GET_CHAIN','AREA, REGION, DISTRICT, STORE',
                    'Store: '||to_char(O_store));
   fetch C_GET_CHAIN into O_chain;
   SQL_LIB.SET_MARK('CLOSE','C_GET_CHAIN','AREA, REGION, DISTRICT, STORE',
                    'Store: '||to_char(O_store));
   close C_GET_CHAIN;
   if O_chain is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('CHAIN_NOT_FOUND',
                                            NULL,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   --- Get Chain Name
   if ORGANIZATION_ATTRIB_SQL.CHAIN_NAME(O_error_message,
                                         O_chain,
                                         O_chain_name) = FALSE then
      return FALSE;
   end if;
   ---
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_LOCATION_INFO;
-------------------------------------------------------------------------------------------
--- Internal Function.  This function will insert all needed balance groups for the
---                     specified store/day. It will also update the required errors for the
---                     balance groups. It is called from SETUP_FOR_AUDIT. This
---                     functions provides the same functionality as CreateBalanceGroup and
---                     UpdateErrors in saimpltogfin.pc except for only one specified store/day.
---
FUNCTION SETUP_BALANCE_GROUPS(O_error_message     IN OUT  VARCHAR2,
                              I_store_day_seq_no  IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                              I_store             IN      SA_STORE_DAY.STORE%TYPE,
                              I_day               IN      SA_STORE_DAY.DAY%TYPE)
   RETURN BOOLEAN IS

   L_program            VARCHAR2(64) := 'STORE_DAY_SQL.SETUP_BALANCE_GROUPS';
   L_table              VARCHAR2(30) := 'SA_ERROR';
   RECORD_LOCKED        EXCEPTION;
   PRAGMA               EXCEPTION_INIT(Record_Locked, -54);
   L_balance_level_ind  SA_SYSTEM_OPTIONS.BALANCE_LEVEL_IND%TYPE;
   L_record_found_ind   VARCHAR2(1);
   L_bal_group_seq_no   SA_BALANCE_GROUP.BAL_GROUP_SEQ_NO%TYPE;

   cursor C_GET_NEEDED_STORE_GROUP is
      select 'x'
        from sa_balance_group bg
       where bg.store_day_seq_no = I_store_day_seq_no;

   cursor C_GET_NEEDED_CASHIER_GROUPS is
      select distinct th.cashier
        from sa_tran_head th
       where th.store_day_seq_no = I_store_day_seq_no
         and th.store            = I_store
         and th.day              = I_day
         and th.tran_type NOT in ('TERM', 'DCLOSE', 'TOTAL', 'ERR', 'REOPEN')
         and th.cashier is NOT NULL
         and NOT exists( select 'x'
                           from sa_balance_group bg
                          where bg.store_day_seq_no = th.store_day_seq_no
                            and bg.cashier          = th.cashier);

   cursor C_GET_NEEDED_REGISTER_GROUPS is
      select distinct th.register
        from sa_tran_head th
       where th.store_day_seq_no = I_store_day_seq_no
         and th.store            = I_store
         and th.day              = I_day
         and th.tran_type NOT in ('TERM', 'DCLOSE', 'TOTAL', 'ERR', 'REOPEN')
         and th.register is NOT NULL
         and NOT exists( select 'x'
                           from sa_balance_group bg
                          where bg.store_day_seq_no = th.store_day_seq_no
                            and bg.register         = th.register);
   cursor C_LOCK_ERRORS is
      select 'x'
        from sa_error e
       where exists( select 'x'
                       from sa_error_codes ec
                      where ec.error_code   = e.error_code
                        and ec.required_ind = 'Y'
                        and ec.used_ind = 'Y')
         and e.store_day_seq_no = I_store_day_seq_no
         and e.store            = I_store
         and e.day              = I_day
         and e.bal_group_seq_no is NULL;
BEGIN
   if SA_SYSTEM_OPTIONS_SQL.GET_BAL_LEVEL(O_error_message,
                                          L_balance_level_ind) = FALSE then
      return FALSE;
   end if;
   ---
   if L_balance_level_ind = 'S' then
      open C_GET_NEEDED_STORE_GROUP;
      fetch C_GET_NEEDED_STORE_GROUP into L_record_found_ind;
      if C_GET_NEEDED_STORE_GROUP%NOTFOUND then
         close C_GET_NEEDED_STORE_GROUP;
         ---
         if SA_SEQUENCE2_SQL.GET_BAL_GROUP_SEQ(O_error_message,
                                               L_bal_group_seq_no) = FALSE then
            return FALSE;
         end if;
         ---
         insert into sa_balance_group(store_day_seq_no,
                                      bal_group_seq_no,
                                      register,
                                      cashier,
                                      start_datetime,
                                      end_datetime)
                               values(I_store_day_seq_no,
                                      L_bal_group_seq_no,
                                      NULL,
                                      NULL,
                                      NULL,
                                      NULL);
      else
         close C_GET_NEEDED_STORE_GROUP;
      end if;
   elsif L_balance_level_ind = 'C' then
      for C_rec in C_GET_NEEDED_CASHIER_GROUPS LOOP
         if SA_SEQUENCE2_SQL.GET_BAL_GROUP_SEQ(O_error_message,
                                               L_bal_group_seq_no) = FALSE then
            return FALSE;
         end if;
         ---
         insert into sa_balance_group(store_day_seq_no,
                                      bal_group_seq_no,
                                      register,
                                      cashier,
                                      start_datetime,
                                      end_datetime)
                               values(I_store_day_seq_no,
                                      L_bal_group_seq_no,
                                      NULL,
                                      C_rec.cashier,
                                      NULL,
                                      NULL);
      end LOOP;
      ---
      open C_LOCK_ERRORS;
      close C_LOCK_ERRORS;
      update sa_error e
         set e.bal_group_seq_no = ( select bg.bal_group_seq_no
                                      from sa_balance_group bg,
                                           sa_tran_head th
                                     where bg.store_day_seq_no = e.store_day_seq_no
                                       and th.store_day_seq_no = bg.store_day_seq_no
                                       and th.tran_seq_no      = e.tran_seq_no
                                       and th.store            = I_store
                                       and th.day              = I_day
                                       and th.cashier          = bg.cashier)
       where exists( select 'x'
                       from sa_error_codes ec
                      where ec.error_code   = e.error_code
                        and ec.required_ind = 'Y'
                        and ec.used_ind = 'Y')
         and e.store_day_seq_no = I_store_day_seq_no
         and e.store            = I_store
         and e.day              = I_day
         and e.bal_group_seq_no is NULL;
   elsif L_balance_level_ind = 'R' then
      for C_rec in C_GET_NEEDED_REGISTER_GROUPS LOOP
         if SA_SEQUENCE2_SQL.GET_BAL_GROUP_SEQ(O_error_message,
                                               L_bal_group_seq_no) = FALSE then
            return FALSE;
         end if;
         ---
         insert into sa_balance_group(store_day_seq_no,
                                      bal_group_seq_no,
                                      register,
                                      cashier,
                                      start_datetime,
                                      end_datetime)
                               values(I_store_day_seq_no,
                                      L_bal_group_seq_no,
                                      C_rec.register,
                                      NULL,
                                      NULL,
                                      NULL);
      end LOOP;
      ---
      open C_LOCK_ERRORS;
      close C_LOCK_ERRORS;
      update sa_error e
         set e.bal_group_seq_no = ( select bg.bal_group_seq_no
                                      from sa_balance_group bg,
                                           sa_tran_head th
                                     where bg.store_day_seq_no = e.store_day_seq_no
                                       and th.store_day_seq_no = bg.store_day_seq_no
                                       and th.tran_seq_no      = e.tran_seq_no
                                       and th.store            = I_store
                                       and th.day              = I_day
                                       and th.register         = bg.register)
       where exists( select 'x'
                       from sa_error_codes ec
                      where ec.error_code   = e.error_code
                        and ec.required_ind = 'Y'
                        and ec.used_ind = 'Y')
         and e.store_day_seq_no = I_store_day_seq_no
         and e.store = I_store
         and e.day = I_day
         and e.bal_group_seq_no is NULL;
   end if;
   ---
   return TRUE;
EXCEPTION
   when RECORD_LOCKED then
      O_error_message := SQL_LIB.CREATE_MSG('TABLE_LOCKED',
                                            L_table,
                                            to_char(I_store_day_seq_no),
                                            NULL);
      return FALSE;
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END SETUP_BALANCE_GROUPS;
-------------------------------------------------------------------------------------------
--- Internal Function.  This function will adjust needed post void transactions
---                     for the specified store/day. It is called from SETUP_FOR_AUDIT. This
---                     functions provides the same functionality as FixPostVoid in
---                     saimpltogfin.pc except for only one specified store/day.
---
FUNCTION FIX_POST_VOIDS(O_error_message    IN OUT  VARCHAR2,
                        I_store_day_seq_no IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                        I_store            IN      SA_STORE_DAY.STORE%TYPE,
                        I_day              IN      SA_STORE_DAY.DAY%TYPE)
   RETURN BOOLEAN IS

   L_program           VARCHAR2(64) := 'STORE_DAY_SQL.FIX_POST_VOIDS';
   L_table             VARCHAR2(30) := 'SA_TRAN_HEAD';
   RECORD_LOCKED       EXCEPTION;
   PRAGMA              EXCEPTION_INIT(Record_Locked, -54);
   L_prev_tran_seq_no  SA_TRAN_HEAD.TRAN_SEQ_NO%TYPE := -1;

/*If changes are made to this cursor, be sure to add changes to the C_GET_POST_VOIDED cursor in the saimptlogfin.pc batch program.*/
   cursor C_GET_POST_VOIDED_TRANS is
      SELECT th.rowid,
             th.tran_seq_no,
             th.rev_no,
             ti.voucher_no
        FROM sa_tran_head th,
             sa_tran_item ti,
             sa_tran_head cancel,
             sa_store_day sd,
             store s
       WHERE th.store_day_seq_no = sd.store_day_seq_no
         AND ti.tran_seq_no = th.tran_seq_no
         AND th.status = 'P'
         AND s.store = sd.store
         AND sd.store_day_seq_no = I_store_day_seq_no
         AND cancel.store_day_seq_no = sd.store_day_seq_no
         AND cancel.tran_type = 'PVOID'
         AND th.tran_no  = cancel.orig_tran_no
         AND (   th.register = cancel.orig_reg_no
              OR (    s.tran_no_generated = 'S'
                  AND        th.register IS NULL
                  AND cancel.orig_reg_no IS NULL))
         AND sd.store     = I_store
         AND cancel.store = I_store
         AND cancel.day   = I_day
         AND th.store     = cancel.store
         AND th.day       = cancel.day
         AND ti.store     = cancel.store
         AND ti.day       = cancel.day
      UNION
      SELECT th.rowid,
             th.tran_seq_no,
             th.rev_no,
             tt.voucher_no
        FROM sa_tran_head th,
             sa_tran_tender tt,
             sa_tran_head cancel,
             sa_store_day sd,
             store s
       WHERE th.store_day_seq_no = I_store_day_seq_no
         AND tt.tran_seq_no = th.tran_seq_no
         AND th.status = 'P'
         AND s.store = sd.store
         AND sd.store_day_seq_no = I_store_day_seq_no
         AND cancel.store_day_seq_no = I_store_day_seq_no
         AND cancel.tran_type = 'PVOID'
         AND th.tran_no  = cancel.orig_tran_no
         AND (   th.register = cancel.orig_reg_no
              OR (    s.tran_no_generated = 'S'
                  AND        th.register IS NULL
                  AND cancel.orig_reg_no IS NULL))
         AND sd.store     = I_store
         AND cancel.store = I_store
         AND cancel.day   = I_day
         AND th.store     = cancel.store
         AND th.day       = cancel.day
         AND tt.store     = cancel.store
         AND tt.day       = cancel.day;

   cursor C_LOCK_TRAN_HEAD(C_tran_seq_no SA_TRAN_HEAD.TRAN_SEQ_NO%TYPE) is
      select 'x'
         from sa_tran_head
        where store_day_seq_no = I_store_day_seq_no
          and tran_seq_no      = C_tran_seq_no
          for update nowait;
BEGIN
   for C_rec in C_GET_POST_VOIDED_TRANS LOOP
      if C_rec.voucher_no is NOT NULL then
         if SA_VOUCHER_SQL.POST_VOID_VOUCHER(O_error_message,
                                             C_rec.tran_seq_no,
                                             C_rec.voucher_no,
                                             NULL) = FALSE then
            return FALSE;
         end if;
      end if;
      ---
      if C_rec.tran_seq_no != L_prev_tran_seq_no then
         if TRANSACTION_SQL.CREATE_REVISIONS(O_error_message,
                                             C_rec.tran_seq_no,
                                             C_rec.rev_no,
                                             I_store,
                                             I_day) = FALSE then
            return FALSE;
         end if;
         open C_LOCK_TRAN_HEAD(C_rec.tran_seq_no);
         close C_LOCK_TRAN_HEAD;
         update sa_tran_head
            set status = 'V',
                rev_no = rev_no + 1
          where tran_seq_no = C_rec.tran_seq_no;
         L_prev_tran_seq_no := C_rec.tran_seq_no;
      end if;
   end LOOP;
   ---
   return TRUE;
EXCEPTION
   when RECORD_LOCKED then
      O_error_message := SQL_LIB.CREATE_MSG('TABLE_LOCKED',
                                            L_table,
                                            to_char(I_store_day_seq_no),
                                            NULL);
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END FIX_POST_VOIDS;
-------------------------------------------------------------------------------------------
--- Internal Function.  This function will delete all of the missing transaction records
---                     that now have transactions associated with them.  It is called from
---                     SETUP_FOR_AUDIT. This function provides the same functionality as
---                     FixMissTran in saimpltogfin.pc except for only one specified store/day.
---
FUNCTION FIX_MISSING_TRAN(O_error_message    IN OUT  VARCHAR2,
                          I_store_day_seq_no IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                          I_store            IN      SA_STORE_DAY.STORE%TYPE,
                          I_day              IN      SA_STORE_DAY.DAY%TYPE)
   RETURN BOOLEAN IS

   L_program  VARCHAR2(64)            := 'STORE_DAY_SQL.FIX_MISSING_TRAN';
   L_table    VARCHAR2(30)            := 'SA_MISSING_TRAN';
   RECORD_LOCKED   EXCEPTION;
   PRAGMA          EXCEPTION_INIT(Record_Locked, -54);

   cursor C_LOCK_MISSING_TRAN is
      select 'x'
         from sa_missing_tran mt
        where exists( select 'x'
                        from sa_tran_head th,
                             store s,
                             sa_store_day sd
                       where th.store_day_seq_no = mt.store_day_seq_no
                         and th.store            = I_store
                         and th.day              = I_day
                         and sd.store_day_seq_no = th.store_day_seq_no
                         and sd.store            = th.store
                         and sd.day              = th.day
                         and s.store             = sd.store
                         and th.tran_no          = mt.tran_no
                         and (   (    s.tran_no_generated = 'R'
                                  and th.register          = mt.register)
                              or (s.tran_no_generated = 'S')))
          and mt.store_day_seq_no = I_store_day_seq_no
      for update nowait;
BEGIN
   open C_LOCK_MISSING_TRAN;
   close C_LOCK_MISSING_TRAN;
   ---
   delete from sa_missing_tran mt
         where exists( select 'x'
                         from sa_tran_head th,
                              store s,
                              sa_store_day sd
                        where th.store_day_seq_no = mt.store_day_seq_no
                          and th.store            = I_store
                          and th.day              = I_day
                          and sd.store_day_seq_no = th.store_day_seq_no
                          and sd.store            = th.store
                          and sd.day              = th.day
                          and s.store             = sd.store
                          and th.tran_no          = mt.tran_no
                          and (   (    s.tran_no_generated = 'R'
                                   and th.register          = mt.register)
                               or (s.tran_no_generated = 'S')))
           and mt.store_day_seq_no = I_store_day_seq_no;
   ---
   return TRUE;
EXCEPTION
   when RECORD_LOCKED then
      O_error_message := SQL_LIB.CREATE_MSG('TABLE_LOCKED',
                                            L_table,
                                            to_char(I_store_day_seq_no),
                                            NULL);
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END FIX_MISSING_TRAN;
-------------------------------------------------------------------------------------------
FUNCTION SETUP_FOR_AUDIT(O_error_message    IN OUT  VARCHAR2,
                         I_store_day_seq_no IN      SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                         I_store            IN      SA_STORE_DAY.STORE%TYPE,
                         I_day              IN      SA_STORE_DAY.DAY%TYPE)
   RETURN BOOLEAN IS

   L_program  VARCHAR2(64)            := 'STORE_DAY_SQL.SETUP_FOR_AUDIT';
   L_store    SA_STORE_DAY.STORE%TYPE := I_store;
   L_day      SA_STORE_DAY.DAY%TYPE   := I_day;

BEGIN
   if I_store_day_seq_no is NULL then
      O_error_message := SQL_LIB.CREATE_MSG('INV_PARAM_PROG_UNIT',
                                            L_program,
                                            NULL,
                                            NULL);
      return FALSE;
   end if;
   ---
   if L_store is NULL or L_day is NULL then
      if GET_INTERNAL_DAY(o_error_message,
                          L_store,
                          L_day,
                          I_store_day_seq_no,
                          NULL,
                          NULL,
                          NULL,
                          NULL) = FALSE then
         return FALSE;
      end if;
   end if;
   /* Insert all needed balance groups and associate them with errors */
   if SETUP_BALANCE_GROUPS(O_error_message,
                           I_store_day_seq_no,
                           L_store,
                           L_day) = FALSE then
      return FALSE;
   end if;
   ---
   /* Fix post void transactions when needed */
   if FIX_POST_VOIDS(O_error_message,
                     I_store_day_seq_no,
                     L_store,
                     L_day) = FALSE then
      return FALSE;
   end if;
   ---
   /* Remove transactions from the missing transactions table if the transactions are
      nolonger missing */
   if FIX_MISSING_TRAN(O_error_message,
                       I_store_day_seq_no,
                       L_store,
                       L_day) = FALSE then
      return FALSE;
   end if;
   ---
   return TRUE;
EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END SETUP_FOR_AUDIT;
----------------------------------------------------------------------------------------------------
FUNCTION GET_DAY_POST_SALE(O_error_message    IN OUT  RTK_ERRORS.RTK_TEXT%TYPE,
                           I_business_date    IN      SA_STORE_DAY.BUSINESS_DATE%TYPE)
   RETURN BOOLEAN IS
----------------------------------------------------------------------------------------------------

   L_program  VARCHAR2(64) := 'STORE_DAY_SQL.GET_DAY_POST_SALE';
   L_day_post_day_sale SA_SYSTEM_OPTIONS.DAY_POST_SALE%TYPE;
   L_valid_date PERIOD.VDATE%TYPE;


   cursor C_VALID_DATE is
      select p.vdate - sa.day_post_sale
        from period p,
             sa_system_options sa;

BEGIN

      SQL_LIB.SET_MARK('OPEN',
                       'C_VALID_DATE',
                       'period, sa_system_options',
                       NULL);
      open C_VALID_DATE;
      ---
      SQL_LIB.SET_MARK('FETCH',
                       'C_VALID_DATE',
                       'period, sa_system_options',
                       NULL);
      fetch C_VALID_DATE into L_valid_date;
      ---
      SQL_LIB.SET_MARK('CLOSE',
                       'C_VALID_DATE',
                       'period, sa_system_options',
                       NULL);
      close C_VALID_DATE;
      ---
      if I_business_date < L_valid_date then
         O_error_message := 'POSDATATOOOLD';
         return FALSE;
      end if;
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END GET_DAY_POST_SALE;
---------------------------------------------------------------------------------------------------------
FUNCTION CHECK_OPEN_PERIOD(O_error_message   IN OUT   RTK_ERRORS.RTK_TEXT%TYPE,
                           O_open_period     IN OUT   VARCHAR2,
                           I_business_date   IN       SA_STORE_DAY.BUSINESS_DATE%TYPE)
   RETURN BOOLEAN IS

   L_program         VARCHAR2(64) := 'STORE_DAY_SQL.CHECK_OPEN_PERIOD';
   L_post_sale_date  PERIOD.VDATE%TYPE;

   cursor C_POST_SALE_DATE is
      select p.vdate - sa.day_post_sale
        from period p,
             sa_system_options sa;

BEGIN

   open C_POST_SALE_DATE;
   fetch C_POST_SALE_DATE into L_post_sale_date;
   close C_POST_SALE_DATE;
   ---
   if I_business_date > L_post_sale_date then
      O_open_period := 'Y';
   else
      O_open_period := 'N';
   end if;

   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END CHECK_OPEN_PERIOD;
---------------------------------------------------------------------------------------------------------
FUNCTION INSERT_STORE_DAY(O_error_message      IN OUT   RTK_ERRORS.RTK_TEXT%TYPE,
                          I_store_day_seq_no   IN       SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE,
                          I_store              IN       SA_STORE_DAY.STORE%TYPE,
                          I_business_date      IN       SA_STORE_DAY.BUSINESS_DATE%TYPE)
RETURN BOOLEAN IS

   L_program  VARCHAR2(64) := 'STORE_DAY_SQL.INSERT_STORE_DAY';

   L_comp_base_date     SA_SYSTEM_OPTIONS.COMP_BASE_DATE%TYPE;
   L_comp_no_days       SA_SYSTEM_OPTIONS.COMP_NO_DAYS%TYPE;
   L_day_post_sale      SA_SYSTEM_OPTIONS.DAY_POST_SALE%TYPE;
   L_vdate              PERIOD.VDATE%TYPE := GET_VDATE();
   L_dummy              VARCHAR2(1) := NULL;

   cursor C_GET_SYSTEM_OPTIONS is
      select comp_base_date,
             comp_no_days,
             day_post_sale
        from sa_system_options;

   cursor C_CHECK_EXISTS is
      select 'x'
        from sa_store_day
       where store = I_store
         and business_date = I_business_date;

 BEGIN

   open C_CHECK_EXISTS;
   fetch C_CHECK_EXISTS into L_dummy;
   close C_CHECK_EXISTS;

   if L_dummy is not NULL then
      O_error_message := SQL_LIB.CREATE_MSG('STORE_DAY_EXISTS',
                                             NULL,
                                             NULL,
                                             NULL);
      return FALSE;
   end if;

   open C_GET_SYSTEM_OPTIONS;
   fetch C_GET_SYSTEM_OPTIONS into L_comp_base_date,
                                   L_comp_no_days,
                                   L_day_post_sale;
   close C_GET_SYSTEM_OPTIONS;

   if I_business_date < L_vdate - L_day_post_sale then
      O_error_message := SQL_LIB.CREATE_MSG('BUSINESS_DATE_VAL',
                                             NULL,
                                             NULL,
                                             NULL);
      return FALSE;
   end if;

   INSERT INTO sa_store_day(store_day_seq_no,
                            business_date,
                            store,
                            day,
                            inv_bus_date_ind,
                            inv_store_ind,
                            store_status,
                            audit_status,
                            data_status)
                     VALUES(I_store_day_seq_no,
                            I_business_date,
                            I_store,
                            SA_DATE_HASH(I_business_date),
                            'N',
                            'N',
                            'W',
                            'U',
                            'R');

   INSERT INTO sa_export_log (store_day_seq_no,
                              store,
                              day,
                              system_code,
                              seq_no,
                              status,
                              datetime)
                       SELECT sd.store_day_seq_no,
                              sd.store, sd.day,
                              std.system_code,
                              NVL(MAX(el.seq_no), 1),
                              'R',
                              NULL
                         FROM sa_store_day sd,
                              sa_store_data std,
                              sa_export_log el
                        WHERE sd.store = std.store
                          AND sd.store_day_seq_no = el.store_day_seq_no(+)
                          AND sd.store = el.store(+)
                          AND sd.day = el.day(+)
                          AND sd.business_date = I_business_date
                          AND sd.store_day_seq_no = I_store_day_seq_no
                          AND std.imp_exp = 'E'
                     GROUP BY sd.store_day_seq_no,
                              sd.store,
                              sd.day,
                              std.system_code;

   INSERT INTO sa_import_log(store_day_seq_no,
                             store,
                             day,
                             system_code,
                             status,
                             datetime)
                      SELECT sd.store_day_seq_no,
                             sd.store,
                             sd.day,
                             std.system_code,
                             'R',
                             NULL
                        FROM sa_store_day sd,
                             sa_store_data std
                       WHERE sd.store = std.store
                         AND sd.business_date = I_business_date
                         AND sd.store_day_seq_no = I_store_day_seq_no
                         AND std.system_code != 'IGTAX'
                         AND std.imp_exp = 'I';

   INSERT INTO sa_flash_sales(business_date,
                              store,
                              weather,
                              temperature,
                              comp_ind,
                              net_sales,
                              net_sales_suspended)
                       SELECT I_business_date,
                              sd.store,
                              NULL,
                              NULL,
                              DECODE(L_comp_base_date,
                                     'S',DECODE(GREATEST(NVL(st.store_open_date, I_business_date) + L_comp_no_days, I_business_date),
                                                NVL(st.store_open_date, I_business_date)+ L_comp_no_days,
                                                'N', 'Y'),
                                     'R',DECODE(SIGN((NVL(st.remodel_date, st.store_open_date)) - I_business_date),
                                                1, 'N', 
                                               (DECODE(SIGN((NVL(st.remodel_date, st.store_open_date) + L_comp_no_days) -  I_business_date),
                                                -1, 'Y', 
                                               (DECODE(SIGN((NVL(st.remodel_date, st.store_open_date) + L_comp_no_days) - I_business_date),
                                                1, 'N', 'Y'))))),
                                     'A',DECODE(SIGN((NVL(st.acquired_date, st.store_open_date)) - I_business_date),
                                                1, 'N', 
                                               (DECODE(SIGN((NVL(st.acquired_date, st.store_open_date) + L_comp_no_days) - I_business_date),
                                                -1, 'Y',
                                               (DECODE(SIGN((NVL(st.acquired_date, st.store_open_date) + L_comp_no_days) - I_business_date),
                                                1, 'N', 'Y')))))),
                              0,
                              0
                         FROM sa_store_day sd, store st
                        WHERE sd.store = st.store
                          AND sd.business_date = I_business_date
                          AND sd.store_day_seq_no = I_store_day_seq_no;

   INSERT INTO sa_store_day_write_lock(store_day_seq_no)
                                VALUES(I_store_day_seq_no);

   commit;
   return TRUE;

EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END INSERT_STORE_DAY;
---------------------------------------------------------------------------------------------------------
FUNCTION NEXT_SEQ_NUMBER(O_error_message      IN OUT   RTK_ERRORS.RTK_TEXT%TYPE,
                         O_store_day_seq_no   IN OUT   SA_STORE_DAY.STORE_DAY_SEQ_NO%TYPE)
RETURN BOOLEAN IS
   L_program   VARCHAR2(64) := 'STORE_DAY_SQL.NEXT_SEQ_NUMBER';
BEGIN
   select SA_STORE_DAY_SEQ_NO_SEQUENCE.NEXTVAL
     into O_store_day_seq_no
     from sys.dual;

   return TRUE;
EXCEPTION
   when OTHERS then
      O_error_message := SQL_LIB.CREATE_MSG('PACKAGE_ERROR',
                                            SQLERRM,
                                            L_program,
                                            NULL);
      return FALSE;
END NEXT_SEQ_NUMBER;
---------------------------------------------------------------------------------------------------------
END STORE_DAY_SQL_V2;
/
