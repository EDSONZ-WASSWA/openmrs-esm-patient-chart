import React from 'react';
import { Button, InlineLoading, Tab, Tabs, TabList, TabPanel, TabPanels } from '@carbon/react';
import { EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDatetime, parseDate, useConfig, ExtensionSlot } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import type { ChartConfig } from '../../config-schema';
import { mapEncounters, useInfiniteVisits } from './visit.resource';
import VisitsTable from './past-visits-components/visits-table';
import VisitSummary from './past-visits-components/visit-summary.component';
import styles from './visit-detail-overview.scss';

interface VisitOverviewComponentProps {
  patientUuid: string;
}

function VisitDetailOverviewComponent({ patientUuid }: VisitOverviewComponentProps) {
  const { t } = useTranslation();
  const { visits, error, hasMore, isLoading, isValidating, mutate, loadMore } = useInfiniteVisits(patientUuid);
  const { showAllEncountersTab } = useConfig<ChartConfig>();

  const visitsWithEncounters = visits
    ?.filter((visit) => visit?.encounters?.length)
    ?.flatMap((visitWithEncounters) => {
      return mapEncounters(visitWithEncounters);
    });

  return (
    <div className={styles.tabs}>
      <Tabs>
        <TabList aria-label="Visit detail tabs" className={styles.tabList}>
          <Tab className={styles.tab} id="visit-summaries-tab">
            {t('visitSummaries', 'Visit summaries')}
          </Tab>
          {showAllEncountersTab ? (
            <Tab className={styles.tab} id="all-encounters-tab">
              {t('allEncounters', 'All encounters')}
            </Tab>
          ) : (
            <></>
          )}
        </TabList>
        <TabPanels>
          <TabPanel>
            {isLoading ? (
              <InlineLoading description={`${t('loading', 'Loading')} ...`} role="progressbar" />
            ) : error ? (
              <ErrorState headerTitle={t('visits', 'visits')} error={error} />
            ) : visits?.length ? (
              <>
                {visits.map((visit) => (
                  <div className={styles.container} key={visit.uuid}>
                    <div className={styles.header}>
                      <div className={styles.visitInfo}>
                        <div>
                          <h4 className={styles.visitType}>{visit?.visitType?.display}</h4>
                          <div className={styles.displayFlex}>
                            <h6 className={styles.dateLabel}>{t('start', 'Start')}:</h6>
                            <span className={styles.date}>{formatDatetime(parseDate(visit?.startDatetime))}</span>
                            {visit?.stopDatetime ? (
                              <>
                                <h6 className={styles.dateLabel}>{t('end', 'End')}:</h6>
                                <span className={styles.date}>{formatDatetime(parseDate(visit?.stopDatetime))}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div>
                          <ExtensionSlot
                            name="visit-detail-overview-actions"
                            className={styles.visitDetailOverviewActions}
                            state={{ patientUuid, visit }}
                          />
                        </div>
                      </div>
                    </div>
                    <VisitSummary visit={visit} patientUuid={patientUuid} />
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.emptyStateContainer}>
                <EmptyState headerTitle={t('visits', 'visits')} displayText={t('Visits', 'Visits')} />
              </div>
            )}
          </TabPanel>
          {showAllEncountersTab && (
            <TabPanel>
              {isLoading ? (
                <InlineLoading description={`${t('loading', 'Loading')} ...`} role="progressbar" />
              ) : error ? (
                <ErrorState headerTitle={t('visits', 'visits')} error={error} />
              ) : visits?.length ? (
                <VisitsTable
                  mutateVisits={mutate}
                  visits={visitsWithEncounters}
                  showAllEncounters
                  patientUuid={patientUuid}
                />
              ) : (
                <div className={styles.emptyStateContainer}>
                  <EmptyState
                    displayText={t('encounters__lower', 'encounters')}
                    headerTitle={t('encounters', 'Encounters')}
                  />
                </div>
              )}
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      {hasMore ? (
        <Button className={styles.loadMoreButton} disabled={!hasMore} onClick={loadMore}>
          {isValidating ? (
            <InlineLoading description={`${t('loading', 'Loading')} ...`} role="progressbar" />
          ) : (
            t('loadMore', 'Load more')
          )}
        </Button>
      ) : null}
    </div>
  );
}

export default VisitDetailOverviewComponent;
