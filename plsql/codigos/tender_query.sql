-- Query to get the total amount by tender type for the month of November
-- Based on RMS Data Model: SA_TRAN_HEAD and SA_TRAN_TENDER tables

SELECT 
    t.TENDER_TYPE_GROUP,
    t.TENDER_TYPE_ID,
    SUM(t.TENDER_AMT) AS TOTAL_TENDER_AMOUNT
FROM 
    SA_TRAN_HEAD h
JOIN 
    SA_TRAN_TENDER t ON h.STORE = t.STORE 
                     AND h.DAY = t.DAY 
                     AND h.TRAN_SEQ_NO = t.TRAN_SEQ_NO
WHERE 
    h.TRAN_DATETIME >= TO_DATE('2024-11-01', 'YYYY-MM-DD')
    AND h.TRAN_DATETIME < TO_DATE('2024-12-01', 'YYYY-MM-DD')
GROUP BY 
    t.TENDER_TYPE_GROUP,
    t.TENDER_TYPE_ID
ORDER BY 
    TOTAL_TENDER_AMOUNT DESC;
