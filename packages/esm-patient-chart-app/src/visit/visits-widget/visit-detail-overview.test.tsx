import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { openmrsFetch, getConfig, useConfig, getDefaultsFromConfigSchema } from '@openmrs/esm-framework';
import { esmPatientChartSchema, type ChartConfig } from '../../config-schema';
import { mockPatient, renderWithSwr, waitForLoadingToFinish } from 'tools';
import { visitOverviewDetailMockData } from '__mocks__';
import VisitDetailOverview from './visit-detail-overview.component';
import { useInfiniteVisits } from './visit.resource';

const mockGetConfig = getConfig as jest.Mock;
const mockOpenmrsFetch = openmrsFetch as jest.Mock;
const mockUseConfig = jest.mocked(useConfig<ChartConfig>);

mockUseConfig.mockReturnValue({
  ...getDefaultsFromConfigSchema(esmPatientChartSchema),
  numberOfVisitsToLoad: 5,
});

jest.mock('./visit.resource', () => {
  const requireActual = jest.requireActual('./visit.resource');
  return {
    ...requireActual,
    useInfiniteVisits: jest.fn(),
  };
});
const mockedUseInfiniteVisits = jest.mocked(useInfiniteVisits);

describe('VisitDetailOverview', () => {
  it('renders an empty state view if encounters data is unavailable', async () => {
    mockedUseInfiniteVisits.mockReturnValueOnce({
      visits: [],
      error: null,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      loadMore: jest.fn(),
      mutate: jest.fn(),
      nextUri: null,
      totalCount: 0,
    });
    mockGetConfig.mockResolvedValue({ htmlFormEntryForms: [] });

    renderWithSwr(<VisitDetailOverview patientUuid={mockPatient.id} />);

    await waitForLoadingToFinish();

    expect(screen.getByRole('heading', { name: /visits/i })).toBeInTheDocument();
    expect(screen.getAllByTitle(/Empty data illustration/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/There are no visits to display for this patient/i)[0]).toBeInTheDocument();
  });

  it('renders an error state view if there was a problem fetching encounter data', async () => {
    mockedUseInfiniteVisits.mockReturnValueOnce({
      visits: [],
      error: {
        message: 'Unauthorized',
        response: {
          status: 401,
          statusText: 'Unauthorized',
        },
      },
      hasMore: false,
      isLoading: false,
      isValidating: false,
      loadMore: jest.fn(),
      mutate: jest.fn(),
      nextUri: null,
      totalCount: 0,
    });

    renderWithSwr(<VisitDetailOverview patientUuid={mockPatient.id} />);

    await waitForLoadingToFinish();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /visits/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Error 401: Unauthorized/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Sorry, there was a problem displaying this information/i)[0]).toBeInTheDocument();
  });

  it(`renders a summary of the patient's visits and encounters when data is available and showAllEncountersTab is true`, async () => {
    const user = userEvent.setup();
    mockedUseInfiniteVisits.mockReturnValue({
      visits: visitOverviewDetailMockData.data.results,
      error: null,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      loadMore: jest.fn(),
      mutate: jest.fn(),
      nextUri: null,
      totalCount: visitOverviewDetailMockData.data.results.length,
    });
    mockGetConfig.mockResolvedValue({ htmlFormEntryForms: [] });
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(esmPatientChartSchema),
      showAllEncountersTab: true,
    });

    renderWithSwr(<VisitDetailOverview patientUuid={mockPatient.id} />);

    await waitForLoadingToFinish();

    const allVisitsTab = screen.getByRole('tab', { name: /All encounters/i });
    const visitSummariesTab = screen.getByRole('tab', { name: /visit summaries/i });

    expect(visitSummariesTab).toBeInTheDocument();
    expect(allVisitsTab).toBeInTheDocument();
    expect(visitSummariesTab).toHaveAttribute('aria-selected', 'true');
    expect(allVisitsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /notes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tests/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /medications/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^encounters$/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /ech/i })).toBeInTheDocument();
    expect(screen.getByText(/^diagnoses$/i)).toBeInTheDocument();
    expect(screen.getByText(/no diagnoses found/i)).toBeInTheDocument();
    expect(screen.getByText(/There are no notes to display for this patient/i)).toBeInTheDocument();
    expect(screen.getByText(/There are no medications to display for this patient/i)).toBeInTheDocument();

    await user.click(allVisitsTab);

    expect(allVisitsTab).toHaveAttribute('aria-selected', 'true');
    expect(visitSummariesTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should render only the visit summary tab when showAllEncountersTab is false', async () => {
    mockedUseInfiniteVisits.mockReturnValue({
      visits: visitOverviewDetailMockData.data.results,
      error: null,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      loadMore: jest.fn(),
      mutate: jest.fn(),
      nextUri: null,
      totalCount: visitOverviewDetailMockData.data.results.length,
    });
    mockGetConfig.mockResolvedValue({ htmlFormEntryForms: [] });
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(esmPatientChartSchema),
      showAllEncountersTab: false,
    });

    renderWithSwr(<VisitDetailOverview patientUuid={mockPatient.id} />);

    await waitForLoadingToFinish();

    const visitSummariesTab = screen.getByRole('tab', { name: /visit summaries/i });

    expect(visitSummariesTab).toBeInTheDocument();
    expect(visitSummariesTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('/All encounters/i')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tests/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /medications/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^encounters$/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /ech/i })).toBeInTheDocument();
    expect(screen.getByText(/^diagnoses$/i)).toBeInTheDocument();
    expect(screen.getByText(/no diagnoses found/i)).toBeInTheDocument();
    expect(screen.getByText(/There are no notes to display for this patient/i)).toBeInTheDocument();
    expect(screen.getByText(/There are no medications to display for this patient/i)).toBeInTheDocument();
  });
});
