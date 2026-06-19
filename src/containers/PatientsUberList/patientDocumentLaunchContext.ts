import type { ParametersParameter, Patient } from 'fhir/r4b';

import { getReference, WithId } from '@beda.software/fhir-react';

export function patientDocumentLaunchContext(patient: WithId<Patient>): ParametersParameter[] {
    const patientRef = getReference(patient);

    return [
        { name: 'patient', resource: patient },
        { name: 'Patient', resource: patient },
        { name: 'Condition', resource: { resourceType: 'Condition', subject: patientRef } },
        { name: 'MedicationStatement', resource: { resourceType: 'MedicationStatement', subject: patientRef } },
        { name: 'Procedure', resource: { resourceType: 'Procedure', subject: patientRef } },
        { name: 'Encounter', resource: { resourceType: 'Encounter', subject: patientRef } },
        { name: 'Observation', resource: { resourceType: 'Observation', subject: patientRef } },
        { name: 'Immunization', resource: { resourceType: 'Immunization', patient: patientRef } },
    ];
}
