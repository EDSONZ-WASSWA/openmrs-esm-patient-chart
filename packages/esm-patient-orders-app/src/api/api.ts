import { useCallback, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { type FetchResponse, openmrsFetch, type OpenmrsResource, restBaseUrl } from '@openmrs/esm-framework';
import { useSystemVisitSetting, useVisitOrOfflineVisit } from '@openmrs/esm-patient-common-lib';

export const careSettingUuid = '6f0c9a92-6f24-11e3-af88-005056821db0';

/**
 * Returns a function which refreshes the patient orders cache. Uses SWR's mutate function.
 * Refreshes patient orders for all kinds of orders.
 *
 * @param patientUuid The UUID of the patient to get an order mutate function for.
 */
export function useMutatePatientOrders(patientUuid: string) {
  const { mutate } = useSWRConfig();
  const mutateOrders = useCallback(
    () =>
      mutate((key) => {
        return typeof key === 'string' && key.startsWith(`${restBaseUrl}/order?patient=${patientUuid}`);
      }),
    [patientUuid, mutate],
  );

  return {
    mutate: mutateOrders,
  };
}

export function getPatientEncounterId(patientUuid: string, abortController: AbortController) {
  return openmrsFetch(`${restBaseUrl}/encounter?patient=${patientUuid}&order=desc&limit=1&v=custom:(uuid)`, {
    signal: abortController.signal,
  });
}

export function getMedicationByUuid(abortController: AbortController, orderUuid: string) {
  return openmrsFetch(
    `${restBaseUrl}/order/${orderUuid}?v=custom:(uuid,route:(uuid,display),action,urgency,display,drug:(display,strength),frequency:(display),dose,doseUnits:(display),orderer,dateStopped,dateActivated,previousOrder,numRefills,duration,durationUnits:(display),dosingInstructions)`,
    {
      signal: abortController.signal,
    },
  );
}

export function useOrderEncounter(
  patientUuid: string,
  encounterTypeUuid: string,
): {
  visitRequired: boolean;
  isLoading: boolean;
  error: Error;
  encounterUuid: string;
  mutate: Function;
} {
  const { systemVisitEnabled, isLoadingSystemVisitSetting, errorFetchingSystemVisitSetting } = useSystemVisitSetting();

  const now = new Date();
  const nowDateString = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const todayEncounter = useSWR<FetchResponse<{ results: Array<OpenmrsResource> }>, Error>(
    !isLoadingSystemVisitSetting && !systemVisitEnabled && patientUuid
      ? `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${encounterTypeUuid}&fromdate=${nowDateString}&limit=1`
      : null,
    openmrsFetch,
  );
  const visit = useVisitOrOfflineVisit(patientUuid);

  const results = useMemo(() => {
    if (isLoadingSystemVisitSetting || errorFetchingSystemVisitSetting) {
      return {
        visitRequired: false,
        isLoading: isLoadingSystemVisitSetting,
        error: errorFetchingSystemVisitSetting,
        encounterUuid: null,
        mutate: () => {},
      };
    }
    return systemVisitEnabled
      ? {
          visitRequired: true,
          isLoading: visit?.isLoading,
          encounterUuid: visit?.currentVisit?.encounters?.find(
            (encounter) => encounter.encounterType?.uuid === encounterTypeUuid,
          )?.uuid,
          error: visit?.error,
          mutate: visit?.mutate,
        }
      : {
          visitRequired: false,
          isLoading: todayEncounter?.isLoading,
          encounterUuid: todayEncounter?.data?.data?.results?.[0]?.uuid,
          error: todayEncounter?.error,
          mutate: todayEncounter?.mutate,
        };
  }, [
    isLoadingSystemVisitSetting,
    errorFetchingSystemVisitSetting,
    visit,
    todayEncounter,
    systemVisitEnabled,
    encounterTypeUuid,
  ]);
  return results;
}
