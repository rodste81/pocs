SET SERVEROUTPUT ON;

DECLARE
    -- Input variables (Change these values to test)
    v_location_id   NUMBER := 1001;      -- Ex: Store or Warehouse ID
    
    -- Internal variables
    v_loc_type      VARCHAR2(1);         -- Will be determined automatically ('S' or 'W')

    -- Output variables
    v_total_stock   NUMBER := 0;
    v_avg_cost      NUMBER := 0;
    v_avg_retail    NUMBER := 0;
    
BEGIN
    DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');
    DBMS_OUTPUT.PUT_LINE('Checking Location: ' || v_location_id);

    -- 1. Determine Location Type (Store or Warehouse)
    BEGIN
        SELECT 'S' INTO v_loc_type FROM store WHERE store = v_location_id;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            BEGIN
                SELECT 'W' INTO v_loc_type FROM wh WHERE wh = v_location_id;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    DBMS_OUTPUT.PUT_LINE('ERROR: Location ' || v_location_id || ' not found in STORE or WH tables.');
                    RETURN; -- Exit execution
            END;
    END;

    DBMS_OUTPUT.PUT_LINE('Location Type Identified: ' || v_loc_type);
    DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');

    -- 2. Calculate Total Stock on Hand
    -- Using ITEM_LOC_SOH (Standard RMS table for Stock on Hand)
    SELECT NVL(SUM(stock_on_hand), 0)
    INTO v_total_stock
    FROM item_loc_soh
    WHERE loc = v_location_id
      AND loc_type = v_loc_type;

    -- 3. Calculate Average Cost and Average Retail
    -- Using ITEM_LOC (Standard RMS table for Item/Location attributes)
    SELECT NVL(AVG(av_cost), 0),
           NVL(AVG(unit_retail), 0)
    INTO v_avg_cost,
         v_avg_retail
    FROM item_loc
    WHERE loc = v_location_id
      AND loc_type = v_loc_type;

    -- Check if we found any data (optional logic)
    IF v_total_stock = 0 AND v_avg_cost = 0 THEN
       DBMS_OUTPUT.PUT_LINE('WARNING: No data found or zero stock for this location.');
    END IF;

    -- 4. Output Results
    DBMS_OUTPUT.PUT_LINE('Total Stock Quantity: ' || v_total_stock);
    DBMS_OUTPUT.PUT_LINE('Average Cost Price:   ' || TO_CHAR(v_avg_cost, '999,999.99'));
    DBMS_OUTPUT.PUT_LINE('Average Retail Price: ' || TO_CHAR(v_avg_retail, '999,999.99'));
    DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');

EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);
END;
/
