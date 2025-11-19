-- Query to get the quantity of sales for the month of November
-- Based on RMS Data Model: TRAN_DATA_HISTORY table
-- TRAN_CODE = 1 represents Net Sales

SELECT 
    SUM(UNITS) AS TOTAL_SALES_QUANTITY,
    SUM(TOTAL_RETAIL) AS TOTAL_SALES_VALUE
FROM 
    TRAN_DATA_HISTORY
WHERE 
    TRAN_CODE = 1 -- Net Sales
    AND TRAN_DATE >= TO_DATE('2024-11-01', 'YYYY-MM-DD')
    AND TRAN_DATE < TO_DATE('2024-12-01', 'YYYY-MM-DD');
