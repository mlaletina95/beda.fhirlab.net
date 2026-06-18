import { Composition, Encounter, Observation, Patient, Procedure } from 'fhir/r4b';

import { ResourceTable } from '@beda.software/emr/dist/components/ResourceTable/index';
import { PatientResources } from '@beda.software/emr/dist/containers/PatientDetails/PatientResources/index';
import { formatHumanDateTime, formatPeriodDateTime } from '@beda.software/emr/utils';
import { WithId } from '@beda.software/fhir-react';

import { getOrganization, getPractitioner } from '../EncountersUberList';
import { getObservationCode, getObservationValue, getEffectiveDateTime } from '../ObservationsUberList';

const patientResourcesTypes = new Set(['immunization', 'conditions', 'allergies', 'consents', 'serviceRequests', 'active-medications']);

interface Props {
    patient: WithId<Patient>;
    type?: string;
}

function ObservationsTable({ patient }: { patient: WithId<Patient> }) {
    return (
        <ResourceTable<Observation>
            resourceType="Observation"
            params={{
                patient: patient.id,
                _sort: '-_lastUpdated',
            }}
            getTableColumns={() => [
                {
                    title: 'Status',
                    key: 'status',
                    render: (resource) => resource.status,
                },
                {
                    title: 'Date',
                    key: 'date',
                    render: (resource) => formatHumanDateTime(getEffectiveDateTime(resource)),
                },
                {
                    title: 'Code',
                    key: 'code',
                    render: (resource) => getObservationCode(resource),
                },
                {
                    title: 'Value',
                    key: 'value',
                    render: (resource) => getObservationValue(resource),
                },
            ]}
        />
    );
}

export function PatientOverviewResources({ patient, type }: Props) {
    if (type === 'observations' || type === 'observation') {
        return <ObservationsTable patient={patient} />;
    }

    if (!type || patientResourcesTypes.has(type)) {
        return <PatientResources patient={patient} />;
    }

    switch (type) {
        case 'encounters':
            return (
                <ResourceTable<Encounter>
                    resourceType="Encounter"
                    params={{
                        patient: patient.id,
                        _sort: '-_lastUpdated',
                    }}
                    getTableColumns={() => [
                        {
                            title: 'Status',
                            key: 'status',
                            render: (resource) => resource.status,
                        },
                        {
                            title: 'Date',
                            key: 'date',
                            render: (resource) => formatPeriodDateTime(resource.period),
                        },
                        {
                            title: 'Practitioner',
                            key: 'practitioner',
                            render: (resource) => {
                                const reference = getPractitioner(resource);
                                return reference?.display ?? reference?.reference;
                            },
                        },
                        {
                            title: 'Organization',
                            key: 'organization',
                            render: (resource) => {
                                const reference = getOrganization(resource);
                                return reference?.display ?? reference?.reference;
                            },
                        },
                    ]}
                />
            );
        case 'procedures':
            return (
                <ResourceTable<Procedure>
                    resourceType="Procedure"
                    params={{
                        subject: patient.id,
                        _sort: '-_lastUpdated',
                    }}
                    getTableColumns={() => [
                        {
                            title: 'Status',
                            key: 'status',
                            render: (resource) => resource.status,
                        },
                        {
                            title: 'Code',
                            key: 'code',
                            render: (resource) => resource.code?.text ?? resource.code?.coding?.[0]?.display,
                        },
                    ]}
                />
            );
        case 'composition':
            return (
                <ResourceTable<Composition>
                    resourceType="Composition"
                    params={{
                        subject: patient.id,
                        _sort: '-date',
                    }}
                    getTableColumns={() => [
                        {
                            title: 'Title',
                            key: 'title',
                            render: (resource) => resource.title,
                        },
                        {
                            title: 'Date',
                            key: 'date',
                            render: (resource) => resource.date,
                        },
                    ]}
                />
            );
        default:
            return <ObservationsTable patient={patient} />;
    }
}
